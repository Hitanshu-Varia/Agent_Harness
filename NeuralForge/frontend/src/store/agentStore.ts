import { create } from 'zustand';
import { produce } from 'immer';

export interface Agent {
    id: string;
    name: string;
    role: string;
    status: 'idle' | 'thinking' | 'working' | 'waiting' | 'done' | 'error';
    provider: string;
    model: string;
    currentTask?: string;
    tokens: number;
    startTime: number;
    doneTime?: number;
    outputLog: string[];
    tokenHistory: number[]; // For sparklines (tokens/sec)
}

interface AgentStore {
    agents: Record<string, Agent>;
    addAgent: (agent: Agent) => void;
    updateAgent: (id: string, patch: Partial<Agent>) => void;
    removeAgent: (id: string) => void;
    appendToken: (id: string, token: string) => void;
    setAgentStatus: (id: string, status: Agent['status']) => void;
}

export const useAgentStore = create<AgentStore>((set) => ({
    agents: {},

    addAgent: (agent) =>
        set((state) =>
            produce(state, (draft) => {
                draft.agents[agent.id] = agent;
            })
        ),

    updateAgent: (id, patch) =>
        set((state) =>
            produce(state, (draft) => {
                if (draft.agents[id]) {
                    Object.assign(draft.agents[id], patch);
                }
            })
        ),

    removeAgent: (id) =>
        set((state) =>
            produce(state, (draft) => {
                delete draft.agents[id];
            })
        ),

    appendToken: (id, token) =>
        set((state) =>
            produce(state, (draft) => {
                const agent = draft.agents[id];
                if (agent) {
                    agent.outputLog.push(token);
                    agent.tokens += 1;

                    // Trigger DOM update event for performant rendering
                    if (typeof window !== 'undefined') {
                        window.dispatchEvent(
                            new CustomEvent(`agent_token_${id}`, { detail: token })
                        );
                    }
                }
            })
        ),

    setAgentStatus: (id, status) =>
        set((state) =>
            produce(state, (draft) => {
                const agent = draft.agents[id];
                if (agent) {
                    agent.status = status;
                    if (status === 'done' || status === 'error') {
                        agent.doneTime = Date.now();
                    }
                }
            })
        ),
}));
