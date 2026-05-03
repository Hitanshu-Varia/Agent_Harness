from pydantic import BaseModel
from typing import List, Dict, Optional

class GPUInfo(BaseModel):
    name: str
    vram_gb: float
    driver_version: str
    load_percent: float

class HardwareInfo(BaseModel):
    cpu_brand: str
    cpu_cores: int
    cpu_freq_mhz: float
    ram_total_gb: float
    ram_available_gb: float
    ram_used_percent: float
    gpu_list: List[GPUInfo]
    disk_free_gb: float
    platform: str
    python_version: str

class CapacityReport(BaseModel):
    tier: str
    max_agents: int
    recommended_agents: int
    max_local_model_size_gb: float
    can_run_local_models: bool
    can_run_gpu_models: bool
    agent_budget: Dict[str, int]
    warnings: List[str]
    suggestions: List[str]

class ResourceSnapshot(BaseModel):
    cpu_percent: float
    ram_percent: float
    gpu_percent: float
    available_ram_gb: float

class ResourceCost(BaseModel):
    ram_mb: float
    cpu_percent: float
