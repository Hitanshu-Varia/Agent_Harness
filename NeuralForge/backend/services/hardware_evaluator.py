import psutil
import GPUtil
import platform
import sys
import shutil
import asyncio
from cpuinfo import get_cpu_info
from typing import Dict

from schemas.system import HardwareInfo, GPUInfo, CapacityReport, ResourceSnapshot, ResourceCost

class HardwareEvaluator:
    @staticmethod
    async def get_system_info() -> HardwareInfo:
        cpu_info = get_cpu_info()
        cpu_brand = cpu_info.get("brand_raw", "Unknown CPU")

        cpu_cores = psutil.cpu_count(logical=True)
        cpu_freq = psutil.cpu_freq()
        cpu_freq_mhz = cpu_freq.current if cpu_freq else 0.0

        mem = psutil.virtual_memory()
        ram_total_gb = mem.total / (1024 ** 3)
        ram_available_gb = mem.available / (1024 ** 3)
        ram_used_percent = mem.percent

        gpu_list = []
        try:
            gpus = GPUtil.getGPUs()
            for gpu in gpus:
                gpu_list.append(GPUInfo(
                    name=gpu.name,
                    vram_gb=gpu.memoryTotal / 1024,
                    driver_version=gpu.driver,
                    load_percent=gpu.load * 100
                ))
        except Exception:
            pass

        disk_usage = shutil.disk_usage("/")
        disk_free_gb = disk_usage.free / (1024 ** 3)

        return HardwareInfo(
            cpu_brand=cpu_brand,
            cpu_cores=cpu_cores,
            cpu_freq_mhz=cpu_freq_mhz,
            ram_total_gb=ram_total_gb,
            ram_available_gb=ram_available_gb,
            ram_used_percent=ram_used_percent,
            gpu_list=gpu_list,
            disk_free_gb=disk_free_gb,
            platform=platform.system() + " " + platform.release(),
            python_version=sys.version.split(" ")[0]
        )

    @staticmethod
    async def evaluate_capacity(hardware: HardwareInfo) -> CapacityReport:
        tier = "low"
        max_agents = 2
        recommended_agents = 1
        max_local_model_size_gb = 0.0
        can_run_local_models = False
        can_run_gpu_models = False

        total_vram_gb = sum(gpu.vram_gb for gpu in hardware.gpu_list)

        if hardware.ram_total_gb > 32 or total_vram_gb > 16:
            tier = "workstation"
            max_agents = 16
            recommended_agents = 8
            can_run_local_models = True
            can_run_gpu_models = total_vram_gb > 0
            max_local_model_size_gb = hardware.ram_total_gb * 0.7
        elif hardware.ram_total_gb >= 16 and hardware.cpu_cores >= 8:
            tier = "high"
            max_agents = 8
            recommended_agents = 4
            can_run_local_models = True
            can_run_gpu_models = total_vram_gb > 0
            max_local_model_size_gb = 13.0
        elif hardware.ram_total_gb >= 8 and hardware.cpu_cores >= 4:
            tier = "mid"
            max_agents = 4
            recommended_agents = 2
            can_run_local_models = True
            can_run_gpu_models = total_vram_gb > 0
            max_local_model_size_gb = 7.0

        warnings = []
        suggestions = []

        if hardware.ram_total_gb < 8:
            warnings.append("Low RAM detected. Limit concurrent agents to 2.")
            suggestions.append("Consider upgrading RAM or using cloud APIs for LLM inference.")
        if not can_run_gpu_models:
            suggestions.append("No suitable GPU detected. Local models will run on CPU and may be slow.")

        agent_budget = {
            "architect": 1,
            "builder": max(1, max_agents // 2),
            "reviewer": 1,
            "tester": max(1, max_agents // 4),
            "security": 1
        }

        return CapacityReport(
            tier=tier,
            max_agents=max_agents,
            recommended_agents=recommended_agents,
            max_local_model_size_gb=max_local_model_size_gb,
            can_run_local_models=can_run_local_models,
            can_run_gpu_models=can_run_gpu_models,
            agent_budget=agent_budget,
            warnings=warnings,
            suggestions=suggestions
        )

    @staticmethod
    async def monitor_resources() -> ResourceSnapshot:
        cpu_percent = psutil.cpu_percent(interval=0.1)
        mem = psutil.virtual_memory()
        ram_percent = mem.percent
        available_ram_gb = mem.available / (1024 ** 3)

        gpu_percent = 0.0
        try:
            gpus = GPUtil.getGPUs()
            if gpus:
                gpu_percent = sum(gpu.load for gpu in gpus) / len(gpus) * 100
        except Exception:
            pass

        return ResourceSnapshot(
            cpu_percent=cpu_percent,
            ram_percent=ram_percent,
            gpu_percent=gpu_percent,
            available_ram_gb=available_ram_gb
        )

    @staticmethod
    async def calculate_agent_resource_cost(agent_type: str, model_name: str) -> ResourceCost:
        if "gpt" in model_name.lower() or "claude" in model_name.lower():
            ram_mb = 50.0
            cpu_percent = 1.0
        else:
            # Simple heuristic for local models
            try:
                # E.g., llama3:8b
                parts = model_name.split(":")
                size_str = parts[-1].replace("b", "") if len(parts) > 1 else "7"
                params_b = float(size_str)
            except ValueError:
                params_b = 7.0

            # roughly params * 1000 / num_layers * 1.2
            # Let's say a 7B model takes 7000MB, divide by ~32 layers * 1.2 = ~260MB per agent extra overhead
            ram_mb = (params_b * 1000) / 32 * 1.2
            cpu_percent = 5.0

        return ResourceCost(
            ram_mb=ram_mb,
            cpu_percent=cpu_percent
        )
