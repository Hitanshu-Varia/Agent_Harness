import React, { useEffect, useState } from 'react';
import { useAgentStore } from '../../store/agentStore';
import { X, Copy, Download, Check } from 'lucide-react';

interface AgentOutputModalProps {
    agentId: string | null;
    onClose: () => void;
}

export const AgentOutputModal: React.FC<AgentOutputModalProps> = ({ agentId, onClose }) => {
    const agent = useAgentStore((state) => agentId ? state.agents[agentId] : null);
    const [copied, setCopied] = useState(false);

    // Dynamically load highlight.js
    useEffect(() => {
        if (!document.getElementById('highlight-js-script')) {
            const script = document.createElement('script');
            script.id = 'highlight-js-script';
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js';
            script.async = true;
            document.body.appendChild(script);

            const link = document.createElement('link');
            link.id = 'highlight-js-css';
            link.rel = 'stylesheet';
            link.href = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css';
            document.head.appendChild(link);
        }
    }, []);

    // Apply highlighting when output changes or script loads
    useEffect(() => {
        const timeout = setTimeout(() => {
            if ((window as unknown as { hljs: { highlightElement: (el: Element) => void } }).hljs) {
                document.querySelectorAll('pre code').forEach((block) => {
                    (window as unknown as { hljs: { highlightElement: (el: Element) => void } }).hljs.highlightElement(block);
                });
            }
        }, 100);
        return () => clearTimeout(timeout);
    }, [agent?.outputLog]);

    if (!agentId || !agent) return null;

    const fullOutput = agent.outputLog.join('');

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(fullOutput);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy', err);
        }
    };

    const handleDownload = () => {
        const blob = new Blob([fullOutput], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${agent.name}-output.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 md:p-8">
            <div className="bg-[#0f0f0f] border border-[#333] w-full max-w-5xl h-full max-h-full rounded-lg flex flex-col shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-[#333] bg-[#1a1a1a]">
                    <div className="flex items-center gap-3">
                        <h2 className="text-lg font-mono font-bold text-white">{agent.name} Output</h2>
                        <span className="text-xs bg-[#2a2a2a] px-2 py-1 rounded text-gray-400 font-mono">
                            {agent.tokens.toLocaleString()} tokens
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleCopy}
                            className="flex items-center gap-2 px-3 py-1.5 text-sm font-mono text-gray-300 hover:text-white bg-[#2a2a2a] hover:bg-[#333] rounded transition-colors"
                        >
                            {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                            {copied ? 'Copied!' : 'Copy'}
                        </button>
                        <button
                            onClick={handleDownload}
                            className="flex items-center gap-2 px-3 py-1.5 text-sm font-mono text-gray-300 hover:text-white bg-[#2a2a2a] hover:bg-[#333] rounded transition-colors"
                        >
                            <Download size={16} />
                            Download .md
                        </button>
                        <div className="w-px h-6 bg-[#333] mx-1"></div>
                        <button
                            onClick={onClose}
                            className="p-1.5 text-gray-400 hover:text-white hover:bg-[#333] rounded transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto p-4 bg-[#0a0a0a]">
                    <pre className="m-0">
                        <code className="text-sm font-mono whitespace-pre-wrap break-words text-[#00D4AA] language-markdown">
                            {fullOutput || 'Waiting for output...'}
                        </code>
                    </pre>
                </div>
            </div>
        </div>
    );
};
