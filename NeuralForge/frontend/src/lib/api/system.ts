export interface GPUInfo {
  name: string;
  vram_gb: number;
  driver_version: string;
  load_percent: number;
}

export interface HardwareInfo {
  cpu_brand: string;
  cpu_cores: number;
  cpu_freq_mhz: number;
  ram_total_gb: number;
  ram_available_gb: number;
  ram_used_percent: number;
  gpu_list: GPUInfo[];
  disk_free_gb: number;
  platform: string;
  python_version: string;
}

export interface CapacityReport {
  tier: "low" | "mid" | "high" | "workstation";
  max_agents: number;
  recommended_agents: number;
  max_local_model_size_gb: number;
  can_run_local_models: boolean;
  can_run_gpu_models: boolean;
  agent_budget: Record<string, number>;
  warnings: string[];
  suggestions: string[];
}

export interface ResourceSnapshot {
  cpu_percent: number;
  ram_percent: number;
  gpu_percent: number;
  available_ram_gb: number;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function getHardwareInfo(): Promise<HardwareInfo> {
  const response = await fetch(`${API_BASE_URL}/system/hardware`);
  if (!response.ok) {
    throw new Error('Failed to fetch hardware info');
  }
  return response.json();
}

export async function getCapacityReport(): Promise<CapacityReport> {
  const response = await fetch(`${API_BASE_URL}/system/capacity`);
  if (!response.ok) {
    throw new Error('Failed to fetch capacity report');
  }
  return response.json();
}

export async function getResources(): Promise<ResourceSnapshot> {
  const response = await fetch(`${API_BASE_URL}/system/resources`);
  if (!response.ok) {
    throw new Error('Failed to fetch resources');
  }
  return response.json();
}

export function createResourceMonitorWebSocket(
  onMessage: (data: ResourceSnapshot) => void,
  onError?: (error: Event) => void
): WebSocket {
  const wsUrl = API_BASE_URL.replace(/^http/, 'ws') + '/system/monitor';
  const ws = new WebSocket(wsUrl);

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onMessage(data);
    } catch (e) {
      console.error('Failed to parse WebSocket message', e);
    }
  };

  if (onError) {
    ws.onerror = onError;
  }

  return ws;
}
