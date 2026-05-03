export interface ProviderConfig {
  id: string;
  name: string;
  apiKey?: string;
  baseUrl?: string;
}

export interface ApiKey {
  id: string;
  provider: string;
  key: string;
  createdAt: string;
}

export interface HardwareInfo {
  cpu: string;
  ram: string;
  gpu?: string;
  os: string;
}

export type AgentStatus = 'idle' | 'running' | 'error' | 'offline';

export interface Agent {
  id: string;
  name: string;
  role: string;
  status: AgentStatus;
  projectId: string;
  provider: string;
  model: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  projectId: string;
  agentId?: string;
  createdAt: string;
  updatedAt: string;
}

export type MessageRole = 'user' | 'assistant' | 'system';

export interface ConversationMessage {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: string;
}
