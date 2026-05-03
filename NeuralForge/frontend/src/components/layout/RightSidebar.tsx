"use client";

import { useState } from "react";

export function RightSidebar({
  collapsed,
  setCollapsed,
}: {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
}) {
  const [activeTab, setActiveTab] = useState<"agents" | "memory" | "settings">("agents");

  if (collapsed) {
    return (
      <div className="w-16 h-full flex flex-col items-center py-4 bg-card cursor-pointer hover:bg-accent transition-colors" onClick={() => setCollapsed(false)}>
        <span className="text-xl font-bold text-muted-foreground">&gt;&gt;</span>
      </div>
    );
  }

  return (
    <div className="w-[320px] h-full flex flex-col bg-card shrink-0">
      <div className="flex border-b">
        {(["agents", "memory", "settings"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 text-sm font-medium capitalize ${
              activeTab === tab ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab}
          </button>
        ))}
        <button onClick={() => setCollapsed(true)} className="px-3 text-muted-foreground hover:text-foreground border-l">
          &gt;&gt;
        </button>
      </div>

      <div className="flex-1 p-4 overflow-y-auto">
        {activeTab === "agents" && (
          <div className="space-y-4">
            <h3 className="font-semibold text-sm">Active Agents</h3>
            <div className="p-3 bg-background rounded border text-sm flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <span>Architect</span>
              </div>
              <span className="text-xs text-muted-foreground">Idle</span>
            </div>
          </div>
        )}
        {activeTab === "memory" && (
          <div className="text-sm text-muted-foreground">Memory dashboard placeholder</div>
        )}
        {activeTab === "settings" && (
          <div className="text-sm text-muted-foreground">Project settings placeholder</div>
        )}
      </div>
    </div>
  );
}
