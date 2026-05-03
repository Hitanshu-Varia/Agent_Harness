"use client";

import { useState, useRef, useEffect } from "react";
import { ModelSelector } from "./ModelSelector";

export function ChatInput() {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      // Handle send
      setInput("");
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-2">
      <div className="flex items-center justify-between px-1">
        <ModelSelector />
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Max Agents:</span>
          <input
            type="number"
            defaultValue={5}
            min={1}
            max={10}
            className="w-16 bg-background border rounded px-2 py-0.5 text-foreground"
          />
        </div>
      </div>
      <div className="relative flex items-end gap-2 bg-card border rounded-lg p-2 shadow-sm focus-within:ring-1 focus-within:ring-primary">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter your command... (Cmd+Enter to send)"
          className="w-full max-h-[200px] bg-transparent resize-none outline-none py-2 px-2 text-sm placeholder:text-muted-foreground"
          rows={1}
        />
        <button
          className="h-10 px-4 bg-primary text-primary-foreground rounded-md font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
          disabled={!input.trim()}
        >
          Send
        </button>
      </div>
    </div>
  );
}
