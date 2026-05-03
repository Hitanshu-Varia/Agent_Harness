import { create } from 'zustand';

interface Agent {
    agent_id: string;
    agent_type: string;
    name: string;
    status: string;
    assigned_model: string;
    current_task_id: string | null;
    output_log?: string[];
}

interface SubTask {
    id: string;
    title: string;
    description: string;
    agent_type: string;
    depends_on: string[];
    status?: 'pending' | 'running' | 'success' | 'error';
    result?: string;
}

interface TaskPlan {
    estimated_agents_needed: number;
    subtasks: SubTask[];
}

interface ProjectState {
    session: unknown | null;
    agents: Record<string, Agent>;
    taskPlan: TaskPlan | null;
    tasks: Record<string, SubTask>;
    messages: unknown[];
    isRunning: boolean;

    // Actions
    handleSocketEvent: (event: Record<string, unknown>) => void;
    clearState: () => void;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
    session: null,
    agents: {},
    taskPlan: null,
    tasks: {},
    messages: [],
    isRunning: false,

    handleSocketEvent: (event: Record<string, unknown>) => {
        const state = get();

        switch (event.type) {
            case 'session_state':
                set({
                    session: event.session,
                    taskPlan: (event.session as Record<string, unknown>).task_plan as TaskPlan,
                    isRunning: (event.session as Record<string, unknown>).status === 'starting' ||  (event.session as Record<string, unknown>).status === 'running'
                });
                break;

            case 'task_plan':
                set({
                    taskPlan: event.plan as TaskPlan,
                    tasks: (event.plan as TaskPlan).subtasks.reduce((acc: Record<string, SubTask>, task: SubTask) => {
                        acc[task.id] = { ...task, status: 'pending' };
                        return acc;
                    }, {}),
                    isRunning: true
                });
                break;

            case 'agent_spawned':
                set(() => ({
                    agents: {
                        ...state.agents,
                        [(event.agent as Agent).agent_id]: { ...(event.agent as Agent), output_log: [] }
                    }
                }));
                break;

            case 'agent_status':
                set(() => ({
                    agents: {
                        ...state.agents,
                        [event.agent_id as string]: {
                            ...state.agents[event.agent_id as string],
                            status: event.status as "pending" | "running" | "success" | "error"
                        }
                    }
                }));
                break;

            case 'task_started':
                set(() => ({
                    tasks: {
                        ...state.tasks,
                        [event.task_id as string]: {
                            ...state.tasks[event.task_id as string],
                            status: 'running'
                        }
                    },
                    agents: {
                        ...state.agents,
                        [event.agent_id as string]: {
                            ...state.agents[event.agent_id as string],
                            current_task_id: event.task_id as string
                        }
                    }
                }));
                break;

            case 'agent_token':
                set((state) => {
                    const agent = state.agents[event.agent_id as string];
                    if (!agent) return state;
                    return {
                        agents: {
                            ...state.agents,
                            [event.agent_id as string]: {
                                ...agent,
                                output_log: [...(agent.output_log || []), event.token as string]
                            }
                        }
                    };
                });
                break;

            case 'task_complete':
                set(() => ({
                    tasks: {
                        ...state.tasks,
                        [event.task_id as string]: {
                            ...state.tasks[event.task_id as string],
                            status: event.status as "pending" | "running" | "success" | "error"
                        }
                    }
                }));
                break;

            case 'agent_done':
                // Handled implicitly by status updates or we can log it
                break;

            case 'error':
                console.error('Orchestrator error:', event.message);
                break;

            default:
                console.log('Unhandled event type:', event.type);
        }
    },

    clearState: () => {
        set({
            session: null,
            agents: {},
            taskPlan: null,
            tasks: {},
            messages: [],
            isRunning: false
        });
    }
}));
