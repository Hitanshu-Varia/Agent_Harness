"use client";

export function TopBar() {
  return (
    <div className="h-14 border-b flex items-center justify-between px-4 bg-background z-10">
      <div className="flex items-center gap-3">
        <h2 className="font-semibold text-lg">Project Alpha</h2>
        <span className="px-2 py-0.5 rounded text-xs font-medium bg-secondary text-secondary-foreground border">
          Idle
        </span>
      </div>
      <button className="px-3 py-1.5 bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground rounded text-sm font-medium transition-colors hidden">
        Stop Run
      </button>
    </div>
  );
}
