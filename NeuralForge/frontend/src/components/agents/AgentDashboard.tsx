import React, { useState, useMemo } from 'react';
import { useAgentStore } from '../../store/agentStore';
import { AgentCard } from './AgentCard';
import { AgentTimeline } from './AgentTimeline';
import { SpawnAgentModal } from './SpawnAgentModal';
import { AgentOutputModal } from './AgentOutputModal';
import { ChevronDown, ChevronRight, Plus } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';

// Optimized helper component to only re-render when the agent list changes, not when internal agent state changes
const AgentList = ({ isCompletedExpanded, setIsCompletedExpanded, setSelectedAgentId }: { isCompletedExpanded: boolean, setIsCompletedExpanded: (val: boolean) => void, setSelectedAgentId: (id: string) => void }) => {
    // Only subscribe to the agent IDs and status to group them properly.
    // We use useShallow to prevent re-renders unless the mapped array elements actually change.
    const agentsSummary = useAgentStore(useShallow((state) =>
        Object.values(state.agents).map(a => ({ id: a.id, status: a.status }))
    ));

    const activeAgentIds = useMemo(() =>
        agentsSummary.filter(a => a.status !== 'done' && a.status !== 'error').map(a => a.id),
        [agentsSummary]
    );

    const completedAgentIds = useMemo(() =>
        agentsSummary.filter(a => a.status === 'done' || a.status === 'error').map(a => a.id),
        [agentsSummary]
    );

    return (
        <>
            {/* Active Agents */}
            <div className="flex flex-col gap-3">
                {activeAgentIds.length === 0 ? (
                    <div className="text-gray-500 text-sm font-mono italic p-4 border border-dashed border-[#333] rounded-md text-center">
                        No active agents.
                    </div>
                ) : (
                    activeAgentIds.map(id => (
                        <div key={id} id={`agent-card-${id}`} className="transition-colors duration-500 rounded-md">
                            <AgentCard agentId={id} onViewFull={setSelectedAgentId} />
                        </div>
                    ))
                )}
            </div>

            {/* Completed Agents (Collapsible) */}
            {completedAgentIds.length > 0 && (
                <div className="mt-4 border-t border-[#333] pt-4">
                    <button
                        onClick={() => setIsCompletedExpanded(!isCompletedExpanded)}
                        className="flex items-center gap-2 text-gray-400 hover:text-white font-mono text-sm mb-3 transition-colors w-full text-left"
                    >
                        {isCompletedExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        Completed Agents ({completedAgentIds.length})
                    </button>

                    {isCompletedExpanded && (
                        <div className="flex flex-col gap-3 opacity-70">
                            {completedAgentIds.map(id => (
                                <div key={id} id={`agent-card-${id}`}>
                                    <AgentCard agentId={id} onViewFull={setSelectedAgentId} />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </>
    );
};

export const AgentDashboard: React.FC = () => {
    // Only subscribe to agent count for header to prevent massive re-renders
    const activeCount = useAgentStore((state) =>
        Object.values(state.agents).filter(a => a.status !== 'done' && a.status !== 'error').length
    );

    const [isSpawningModalOpen, setIsSpawningModalOpen] = useState(false);
    const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
    const [isCompletedExpanded, setIsCompletedExpanded] = useState(false);

    return (
        <div className="w-full h-full flex flex-col bg-[#0f0f0f] text-white p-4 gap-4 overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#333] pb-3">
                <div className="flex items-center gap-3">
                    <h1 className="text-xl font-bold font-mono text-[#00D4AA]">Agent Control</h1>
                    <span className="bg-[#1e1e1e] border border-[#333] px-2 py-0.5 rounded text-xs font-mono text-gray-400">
                        {activeCount} running
                    </span>
                </div>
                <button
                    onClick={() => setIsSpawningModalOpen(true)}
                    className="flex items-center gap-2 bg-[#1e1e1e] hover:bg-[#333] border border-[#333] px-3 py-1.5 rounded transition-colors text-sm font-mono"
                >
                    <Plus size={16} className="text-[#00D4AA]" />
                    Spawn Agent
                </button>
            </div>

            {/* Timeline */}
            <AgentTimeline />

            {/* Grouped Agent Lists */}
            <AgentList
                isCompletedExpanded={isCompletedExpanded}
                setIsCompletedExpanded={setIsCompletedExpanded}
                setSelectedAgentId={setSelectedAgentId}
            />

            {/* Modals */}
            {isSpawningModalOpen && (
                <SpawnAgentModal onClose={() => setIsSpawningModalOpen(false)} />
            )}

            {selectedAgentId && (
                <AgentOutputModal
                    agentId={selectedAgentId}
                    onClose={() => setSelectedAgentId(null)}
                />
            )}
        </div>
    );
};
