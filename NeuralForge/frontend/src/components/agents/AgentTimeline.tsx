import React, { useMemo } from 'react';
import { useAgentStore } from '../../store/agentStore';

const roleColors: Record<string, string> = {
    Coordinator: 'bg-purple-500',
    Architect: 'bg-blue-500',
    Builder: 'bg-[#00D4AA]',
    Reviewer: 'bg-yellow-500',
    Tester: 'bg-green-500',
    Security: 'bg-red-500',
    Researcher: 'bg-indigo-500',
    Debugger: 'bg-orange-500',
    default: 'bg-gray-500'
};

export const AgentTimeline: React.FC = () => {
    const agents = useAgentStore((state) => Object.values(state.agents));

    // Calculate time bounds
    const { startTime, totalDuration } = useMemo(() => {
        if (agents.length === 0) return { startTime: 0, endTime: 0, totalDuration: 0 };

        const startTimes = agents.map(a => a.startTime);
        const endTimes = agents.map(a => a.doneTime || Date.now());

        const minStart = Math.min(...startTimes);
        const maxEnd = Math.max(...endTimes);

        // Add a 10-second buffer to the end for currently running agents to show they are active
        const displayMaxEnd = agents.some(a => !a.doneTime) ? Date.now() + 10000 : maxEnd;

        return {
            startTime: minStart,
            endTime: displayMaxEnd,
            totalDuration: Math.max(displayMaxEnd - minStart, 1000) // avoid division by zero
        };
    }, [agents]);

    if (agents.length === 0) {
        return null; // Don't show timeline if no agents
    }

    const scrollToAgent = (agentId: string) => {
        // We'll dispatch a custom event or just use DOM ID scrolling
        const element = document.getElementById(`agent-card-${agentId}`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // Add a brief highlight flash
            element.classList.add('bg-[#2a2a2a]');
            setTimeout(() => element.classList.remove('bg-[#2a2a2a]'), 1000);
        }
    };

    return (
        <div className="w-full bg-[#161616] border border-[#333] rounded-md p-3 font-mono text-xs">
            <div className="text-gray-500 mb-2">Timeline View</div>

            <div className="relative w-full border-l border-b border-[#333] pb-2 pl-2">
                {/* Y-axis labels (Agents) implicitly represented by bars */}
                <div className="flex flex-col gap-2 w-full relative h-full">
                    {agents.map((agent) => {
                        const agentEnd = agent.doneTime || Date.now();
                        const startPercent = ((agent.startTime - startTime) / totalDuration) * 100;
                        const widthPercent = ((agentEnd - agent.startTime) / totalDuration) * 100;
                        const roleColor = roleColors[agent.role] || roleColors.default;

                        return (
                            <div
                                key={agent.id}
                                className="relative w-full h-4 group flex items-center cursor-pointer"
                                onClick={() => scrollToAgent(agent.id)}
                            >
                                {/* Background track */}
                                <div className="absolute w-full h-1 bg-[#222] rounded-full"></div>

                                {/* Active bar */}
                                <div
                                    className={`absolute h-2 ${roleColor} rounded-full transition-all group-hover:h-3 opacity-80 group-hover:opacity-100 z-10 shadow-sm`}
                                    style={{
                                        left: `${Math.max(0, startPercent)}%`,
                                        width: `${Math.max(0.5, widthPercent)}%`
                                    }}
                                    title={`${agent.name} (${agent.role})`}
                                />

                                {/* Label shown on hover */}
                                <div
                                    className="absolute left-0 -top-5 hidden group-hover:block bg-[#0f0f0f] border border-[#333] text-white px-2 py-0.5 rounded text-[10px] z-20 whitespace-nowrap shadow-xl"
                                    style={{ left: `${Math.max(0, startPercent)}%` }}
                                >
                                    {agent.name} {agent.status === 'done' ? '(Completed)' : '(Running)'}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Basic X-axis markers (Start and End times) */}
                <div className="absolute -bottom-5 w-full flex justify-between text-[10px] text-gray-600 px-2">
                    <span>0s</span>
                    <span>{Math.floor(totalDuration / 1000)}s</span>
                </div>
            </div>
        </div>
    );
};
