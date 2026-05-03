"use client";

import { useRef } from "react";

export function AgentMessage({
  agentType,
  agentName,
  initialContent = "",
  isStreaming = false,
}: {
  agentType: "architect" | "builder" | "reviewer" | "tester";
  agentName: string;
  initialContent?: string;
  isStreaming?: boolean;
}) {
  const contentRef = useRef<HTMLSpanElement>(null);

  // In a real implementation, you would subscribe to the token stream here
  // and append to contentRef.current.textContent directly for performance

  const getAgentColor = (type: string) => {
    switch (type) {
      case "architect": return "bg-blue-500";
      case "builder": return "bg-amber-500";
      case "reviewer": return "bg-purple-500";
      case "tester": return "bg-green-500";
      default: return "bg-gray-500";
    }
  };

  return (
    <div className="flex w-full px-4 my-4 group">
      <div className="flex-1 max-w-4xl mx-auto flex gap-4">
        <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold ${getAgentColor(agentType)}`}>
          {agentType[0].toUpperCase()}
        </div>
        <div className="flex-1 bg-card border rounded-lg overflow-hidden shadow-sm">
          <div className="bg-secondary/50 px-3 py-1.5 border-b flex items-center gap-2">
            <span className="text-xs font-medium">{agentName}</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{agentType}</span>
          </div>
          <div className="p-4 text-sm font-mono leading-relaxed overflow-x-auto text-foreground">
            <span ref={contentRef}>{initialContent}</span>
            {isStreaming && (
              <span className="inline-block w-2 h-4 bg-primary ml-1 animate-pulse" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
