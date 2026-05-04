import React, { useEffect, useRef, useState, memo } from 'react';
import { useAgentStore } from '../../store/agentStore';
import { Pause, Play, Maximize2, Trash2 } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line } from 'recharts';

interface AgentCardProps {
    agentId: string;
    onViewFull: (agentId: string) => void;
}

const statusColors = {
    idle: 'bg-gray-500',
    thinking: 'bg-amber-500 animate-pulse',
    working: 'bg-teal-500 animate-pulse',
    waiting: 'bg-blue-500',
    done: 'bg-green-500',
    error: 'bg-red-500'
};

const AgentCardComponent: React.FC<AgentCardProps> = ({ agentId, onViewFull }) => {
    // Select granular values to prevent re-rendering when 'tokens' or 'outputLog' update
    // We only re-render when structural info changes (status, tokens just for the counter, but ideally we'd separate token counter too. Let's subscribe to them carefully).

    // Instead of subscribing to the whole agent, we'll only subscribe to non-rapidly changing fields,
    // OR we accept some re-renders for the token counter but avoid re-rendering the heavy text block.
    // Actually, Zustand allows us to use shallow equality or primitive selection.

    const name = useAgentStore((state) => state.agents[agentId]?.name);
    const status = useAgentStore((state) => state.agents[agentId]?.status);
    const model = useAgentStore((state) => state.agents[agentId]?.model);
    const provider = useAgentStore((state) => state.agents[agentId]?.provider);
    const startTime = useAgentStore((state) => state.agents[agentId]?.startTime);
    const doneTime = useAgentStore((state) => state.agents[agentId]?.doneTime);
    const tokenHistory = useAgentStore((state) => state.agents[agentId]?.tokenHistory);
    // Note: We avoid selecting `outputLog` here because it changes rapidly.

    // We do need `tokens` to update the UI counter, but we can update it via ref/event to completely avoid React re-renders!
    const initialTokens = useAgentStore((state) => state.agents[agentId]?.tokens);
    const [tokenDisplay, setTokenDisplay] = useState(initialTokens || 0);

    const removeAgent = useAgentStore((state) => state.removeAgent);

    const logContainerRef = useRef<HTMLDivElement>(null);
    const [isPaused, setIsPaused] = useState(false);
    const [elapsedTime, setElapsedTime] = useState(0);

    // Track elapsed time (status, startTime, doneTime are stable enough)
    useEffect(() => {
        if (!startTime) return;

        let interval: NodeJS.Timeout;
        if (status !== 'done' && status !== 'error') {
            interval = setInterval(() => {
                setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
            }, 1000);
        } else if (doneTime) {
            setElapsedTime(Math.floor((doneTime - startTime) / 1000));
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [status, startTime, doneTime]);

    // Handle token streaming efficiently via DOM mutation
    useEffect(() => {
        const handleToken = (e: CustomEvent<string>) => {
            if (isPaused) return;

            // Update token counter locally without triggering full component re-render
            // We use functional state update here, it does trigger re-render of THIS component,
            // but AgentCard is lightweight without the massive string concatenation now.
            // If even this is too slow, we'd use a ref for the token counter span too.
            setTokenDisplay(prev => prev + 1);

            if (logContainerRef.current) {
                // Just append text content to avoid parsing overhead
                const textNode = document.createTextNode(e.detail);
                logContainerRef.current.appendChild(textNode);

                // Keep only a reasonable amount of text to prevent performance degradation
                const text = logContainerRef.current.textContent || '';
                if (text.length > 500) {
                    logContainerRef.current.textContent = text.slice(-500);
                }

                // Auto-scroll
                logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
            }
        };

        const eventName = `agent_token_${agentId}`;
        window.addEventListener(eventName, handleToken as EventListener);

        // Initialize with existing log directly from store state ONE TIME
        if (logContainerRef.current) {
             const state = useAgentStore.getState();
             const initialLog = state.agents[agentId]?.outputLog;
             if (initialLog) {
                 const text = initialLog.join('');
                 logContainerRef.current.textContent = text.length > 500 ? text.slice(-500) : text;
                 logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
             }
        }

        return () => {
            window.removeEventListener(eventName, handleToken as EventListener);
        };
    }, [agentId, isPaused]); // Removed outputLog and other rapidly changing deps

    if (!name) return null;

    // Format time: "12s", "1m 12s"
    const formatTime = (secs: number) => {
        if (secs < 60) return `${secs}s`;
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return `${m}m ${s}s`;
    };

    // Dummy data for sparkline if history is empty
    const chartData = tokenHistory && tokenHistory.length > 0
        ? tokenHistory.map((val, i) => ({ value: val, index: i }))
        : Array.from({length: 10}).map((_, i) => ({ value: Math.random() * 10, index: i }));

    const handleTerminate = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm(`Are you sure you want to terminate agent ${name}?`)) {
            removeAgent(agentId);
        }
    };

    return (
        <div className="w-full bg-[#1e1e1e] border border-[#333] rounded-md p-3 flex flex-col gap-2 font-mono text-sm text-gray-300">
            {/* Header row */}
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${statusColors[status || 'idle'] || statusColors.idle}`} />
                    <span className="font-bold text-white">{name.toUpperCase()}</span>
                    <span className="text-xs text-gray-500">[{status}]</span>
                </div>
                <div className="text-xs bg-[#2a2a2a] px-2 py-0.5 rounded text-gray-400">
                    {model} &middot; {provider}
                </div>
            </div>

            {/* Content box */}
            <div
                ref={logContainerRef}
                className="bg-[#0f0f0f] border border-[#2a2a2a] rounded p-2 h-16 overflow-y-auto text-xs font-mono text-[#00D4AA] whitespace-pre-wrap break-all"
            >
                {/* Text injected via DOM ref */}
            </div>

            {/* Footer row */}
            <div className="flex justify-between items-end mt-1">
                {/* Stats */}
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                        <span>{tokenDisplay.toLocaleString()} tokens &middot; {formatTime(elapsedTime)}</span>
                        {/* Sparkline */}
                        <div className="w-16 h-4 opacity-50">
                             <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData}>
                                    <Line type="monotone" dataKey="value" stroke="#00D4AA" strokeWidth={1} dot={false} isAnimationActive={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                    <button
                        onClick={(e) => { e.stopPropagation(); setIsPaused(!isPaused); }}
                        title={isPaused ? "Resume" : "Pause"}
                        className="p-1.5 hover:bg-[#333] rounded text-gray-400 hover:text-white transition-colors z-10 relative"
                    >
                        {isPaused ? <Play size={14} /> : <Pause size={14} />}
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onViewFull(agentId); }}
                        title="View Full Output"
                        className="p-1.5 hover:bg-[#333] rounded text-gray-400 hover:text-white transition-colors z-10 relative"
                    >
                        <Maximize2 size={14} />
                    </button>
                    <button
                        onClick={handleTerminate}
                        title="Terminate"
                        className="p-1.5 hover:bg-red-900/30 rounded text-red-400 hover:text-red-300 transition-colors ml-1 z-10 relative"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export const AgentCard = memo(AgentCardComponent);
