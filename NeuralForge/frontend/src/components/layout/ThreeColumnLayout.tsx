"use client";

import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { RightSidebar } from "./RightSidebar";

export function ThreeColumnLayout({
  children,
  projectId,
}: {
  children: React.ReactNode;
  projectId: string;
}) {
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <Sidebar collapsed={leftCollapsed} setCollapsed={setLeftCollapsed} projectId={projectId} />
      <main className="flex-1 min-w-0 h-full border-x flex flex-col">
        {children}
      </main>
      <RightSidebar collapsed={rightCollapsed} setCollapsed={setRightCollapsed} />
    </div>
  );
}
