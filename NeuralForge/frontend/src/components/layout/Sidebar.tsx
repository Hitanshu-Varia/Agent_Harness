"use client";

import { useTheme } from "next-themes";

export function Sidebar({
  collapsed,
  setCollapsed,
  projectId,
}: {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  projectId: string;
}) {
  const { theme, setTheme } = useTheme();

  if (collapsed) {
    return (
      <div className="w-16 h-full flex flex-col items-center py-4 bg-card cursor-pointer hover:bg-accent transition-colors" onClick={() => setCollapsed(false)}>
        <span className="text-xl font-bold text-primary">N</span>
      </div>
    );
  }

  return (
    <div className="w-[280px] h-full flex flex-col bg-card shrink-0">
      <div className="p-4 flex items-center justify-between border-b">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-primary-foreground font-bold">N</div>
          <span className="font-bold text-lg">NeuralForge</span>
        </div>
        <button onClick={() => setCollapsed(true)} className="text-muted-foreground hover:text-foreground">
          &lt;&lt;
        </button>
      </div>

      <div className="p-4 border-b">
        <select className="w-full bg-background border rounded p-2 text-sm text-foreground">
          <option>Project {projectId}</option>
        </select>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        <div className="text-xs font-semibold text-muted-foreground mb-2 px-2 uppercase tracking-wider">Sessions</div>
        <button className="w-full text-left px-2 py-1.5 rounded text-sm hover:bg-accent hover:text-accent-foreground mb-1 text-muted-foreground">Previous run 1</button>
        <button className="w-full text-left px-2 py-1.5 rounded text-sm hover:bg-accent hover:text-accent-foreground mb-1 text-muted-foreground">Previous run 2</button>
      </div>

      <div className="p-4 border-t">
        <button className="w-full bg-primary text-primary-foreground py-2 rounded font-medium hover:opacity-90 mb-4">
          + New Run
        </button>
        <div className="flex items-center justify-between mt-auto pt-4 border-t border-border/50">
          <button className="text-muted-foreground hover:text-foreground p-1">⚙️</button>
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="text-muted-foreground hover:text-foreground p-1"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500"></span> CPU: 12%
          </div>
        </div>
      </div>
    </div>
  );
}
