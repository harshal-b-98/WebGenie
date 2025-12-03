"use client";

import { useParams } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { ChatInterface } from "@/components/features/chat/chat-interface";

export default function ChatPage() {
  const params = useParams();
  const siteId = params.siteId as string;

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-8rem)]">
        <ChatInterface siteId={siteId} />
      </div>
    </DashboardLayout>
  );
}
