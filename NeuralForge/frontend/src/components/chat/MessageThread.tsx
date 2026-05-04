"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef } from "react";
import { UserMessage } from "./UserMessage";
import { AgentMessage } from "./AgentMessage";
import { SystemMessage } from "./SystemMessage";
import { TaskPlanView } from "./TaskPlanView";

type TaskStatus = "pending" | "running" | "done" | "error";

interface Task {
  id: string;
  title: string;
  agentType: string;
  status: TaskStatus;
}

// Mock data
const MOCK_MESSAGES = [
  { id: 1, type: "user", content: "Create a simple python api", timestamp: "10:00 AM" },
  { id: 2, type: "system", content: "Task plan created · 3 agents spawned" },
  {
    id: 3,
    type: "plan",
    tasks: [
      { id: "t1", title: "Design API", agentType: "architect", status: "done" as TaskStatus },
      { id: "t2", title: "Write code", agentType: "builder", status: "running" as TaskStatus },
      { id: "t3", title: "Write tests", agentType: "tester", status: "pending" as TaskStatus },
    ]
  },
  { id: 4, type: "agent", agentType: "architect" as const, agentName: "Architect-1", content: "I'll design the API using FastAPI..." },
  { id: 5, type: "agent", agentType: "builder" as const, agentName: "Builder-1", content: "Implementing the FastAPI application...", isStreaming: true },
];

export function MessageThread() {
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: MOCK_MESSAGES.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100, // Make a reasonable guess for item size
  });

  return (
    <div
      ref={parentRef}
      className="h-full overflow-auto w-full custom-scrollbar pb-4"
    >
      <div
        className="w-full relative"
        style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualItem) => {
          const msg = MOCK_MESSAGES[virtualItem.index];

          return (
            <div
              key={virtualItem.key}
              className="absolute top-0 left-0 w-full"
              style={{
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
              }}
              ref={rowVirtualizer.measureElement}
              data-index={virtualItem.index}
            >
              {msg.type === "user" && (
                <UserMessage content={msg.content as string} timestamp={msg.timestamp as string} />
              )}
              {msg.type === "system" && (
                <SystemMessage content={msg.content as string} />
              )}
              {msg.type === "plan" && (
                <TaskPlanView tasks={msg.tasks as Task[]} />
              )}
              {msg.type === "agent" && (
                <AgentMessage
                  agentType={msg.agentType as "architect" | "builder" | "reviewer" | "tester"}
                  agentName={msg.agentName as string}
                  initialContent={msg.content as string}
                  isStreaming={msg.isStreaming}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
