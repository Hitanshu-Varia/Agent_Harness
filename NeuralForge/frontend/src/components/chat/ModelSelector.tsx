"use client";

import { useState } from "react";

export function ModelSelector() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState("gpt-4o");

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-3 py-1.5 bg-secondary text-secondary-foreground text-sm font-medium rounded border hover:bg-secondary/80 flex items-center gap-2"
      >
        {selectedModel}
        <span className="text-xs opacity-50">▼</span>
      </button>

      {isOpen && (
        <div className="absolute bottom-full left-0 mb-2 w-64 bg-card border rounded-lg shadow-lg overflow-hidden z-50">
          <div className="p-2 border-b bg-secondary/50">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cloud Models</span>
          </div>
          <button
            onClick={() => { setSelectedModel("gpt-4o"); setIsOpen(false); }}
            className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground flex justify-between"
          >
            <span>gpt-4o</span>
            <span className="text-xs text-muted-foreground">128k</span>
          </button>
          <button
            onClick={() => { setSelectedModel("claude-3.5-sonnet"); setIsOpen(false); }}
            className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground flex justify-between"
          >
            <span>claude-3.5-sonnet</span>
            <span className="text-xs text-muted-foreground">200k</span>
          </button>

          <div className="p-2 border-b border-t bg-secondary/50">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Local Models</span>
          </div>
          <button
            onClick={() => { setSelectedModel("llama-3-70b"); setIsOpen(false); }}
            className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground flex justify-between"
          >
            <span>llama-3-70b</span>
            <span className="text-xs text-muted-foreground">8k</span>
          </button>
        </div>
      )}
    </div>
  );
}
