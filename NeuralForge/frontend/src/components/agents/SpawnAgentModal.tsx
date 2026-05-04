import React, { useState } from 'react';
import { X, Cpu } from 'lucide-react';

interface SpawnAgentModalProps {
    onClose: () => void;
}

const AGENT_TYPES = [
    'Coordinator', 'Architect', 'Builder', 'Reviewer',
    'Tester', 'Security', 'Researcher', 'Debugger'
];

const PROVIDERS = {
    'OpenRouter': ['gpt-4o-mini', 'gpt-4-turbo', 'claude-3-opus'],
    'Ollama': ['llama3', 'mistral', 'codellama']
};

export const SpawnAgentModal: React.FC<SpawnAgentModalProps> = ({ onClose }) => {
    const [agentType, setAgentType] = useState(AGENT_TYPES[0]);
    const [provider, setProvider] = useState<keyof typeof PROVIDERS>('OpenRouter');
    const [model, setModel] = useState(PROVIDERS['OpenRouter'][0]);
    const [systemPrompt, setSystemPrompt] = useState('');
    const [isSpawning, setIsSpawning] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newProvider = e.target.value as keyof typeof PROVIDERS;
        setProvider(newProvider);
        setModel(PROVIDERS[newProvider][0]);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSpawning(true);
        setError(null);

        try {
            const response = await fetch('/api/agents/spawn', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    agent_type: agentType,
                    provider,
                    model,
                    system_prompt: systemPrompt || undefined
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to spawn agent');
            }

            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setIsSpawning(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[#0f0f0f] border border-[#333] w-full max-w-md rounded-lg shadow-2xl overflow-hidden font-mono text-gray-300">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-[#333] bg-[#1a1a1a]">
                    <h2 className="text-lg font-bold text-white">Spawn Agent</h2>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-gray-400 hover:text-white hover:bg-[#333] rounded transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-4">
                    {/* RAM Estimate Info */}
                    <div className="flex items-center gap-2 bg-[#1e1e1e] border border-[#333] p-3 rounded text-sm">
                        <Cpu className="text-[#00D4AA]" size={18} />
                        <div>
                            <span className="text-white">This will use ~200MB RAM.</span>
                            <br />
                            <span className="text-gray-500 text-xs">Available: 8.2GB</span>
                        </div>
                    </div>

                    {/* Agent Type */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-bold text-gray-400">Agent Type</label>
                        <select
                            value={agentType}
                            onChange={(e) => setAgentType(e.target.value)}
                            className="bg-[#1a1a1a] border border-[#333] text-white text-sm rounded p-2 focus:outline-none focus:border-[#00D4AA]"
                        >
                            {AGENT_TYPES.map(type => (
                                <option key={type} value={type}>{type}</option>
                            ))}
                        </select>
                    </div>

                    {/* Provider */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-bold text-gray-400">Provider</label>
                        <select
                            value={provider}
                            onChange={handleProviderChange}
                            className="bg-[#1a1a1a] border border-[#333] text-white text-sm rounded p-2 focus:outline-none focus:border-[#00D4AA]"
                        >
                            {Object.keys(PROVIDERS).map(p => (
                                <option key={p} value={p}>{p}</option>
                            ))}
                        </select>
                    </div>

                    {/* Model */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-bold text-gray-400">Model</label>
                        <select
                            value={model}
                            onChange={(e) => setModel(e.target.value)}
                            className="bg-[#1a1a1a] border border-[#333] text-white text-sm rounded p-2 focus:outline-none focus:border-[#00D4AA]"
                        >
                            {PROVIDERS[provider].map(m => (
                                <option key={m} value={m}>{m}</option>
                            ))}
                        </select>
                    </div>

                    {/* Custom Prompt */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-bold text-gray-400 flex justify-between">
                            <span>System Prompt Override</span>
                            <span className="text-xs font-normal text-gray-600">Optional</span>
                        </label>
                        <textarea
                            value={systemPrompt}
                            onChange={(e) => setSystemPrompt(e.target.value)}
                            placeholder="Leave blank to use default prompt..."
                            className="bg-[#1a1a1a] border border-[#333] text-white text-sm rounded p-2 min-h-[100px] resize-y focus:outline-none focus:border-[#00D4AA] placeholder-gray-600"
                        />
                    </div>

                    {error && (
                        <div className="text-red-500 text-sm mt-2">
                            {error}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex justify-end gap-3 mt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSpawning}
                            className={`px-4 py-2 text-sm bg-[#00D4AA] text-black font-bold rounded hover:bg-[#00e6b8] transition-colors ${isSpawning ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {isSpawning ? 'Spawning...' : 'Spawn Agent'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
