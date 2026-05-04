"use client";

import { ThreeColumnLayout } from "@/components/layout/ThreeColumnLayout";
import { MessageThread } from "@/components/chat/MessageThread";
import { TopBar } from "@/components/layout/TopBar";
import { ChatInput } from "@/components/chat/ChatInput";

export default function ProjectPage({ params }: { params: { id: string } }) {
  return (
    <ThreeColumnLayout projectId={params.id}>
      <div className="flex flex-col h-full bg-background relative">
        <TopBar />
        <div className="flex-1 overflow-hidden relative">
          <MessageThread />
        </div>
        <div className="p-4 border-t">
          <ChatInput />
        </div>
      </div>
    </ThreeColumnLayout>
  );
}
