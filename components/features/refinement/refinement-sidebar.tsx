"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { MessageBubble } from "@/components/features/chat/message-bubble";
import { MessageInput } from "@/components/features/chat/message-input";
import { TypingIndicator } from "@/components/features/chat/typing-indicator";
import { toast } from "sonner";
import { X } from "lucide-react";

interface RefinementSidebarProps {
  siteId: string;
  currentVersionId: string;
  onApplyChanges: (versionId: string) => void;
  onClose: () => void;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export function RefinementSidebar({
  siteId,
  currentVersionId,
  onApplyChanges,
  onClose,
}: RefinementSidebarProps) {
  const storageKey = `refinement-chat-${siteId}`;

  // Initialize messages - load from localStorage if available
  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          // Convert timestamp strings back to Date objects
          return parsed.map((m: Message & { timestamp: string }) => ({
            ...m,
            timestamp: new Date(m.timestamp),
          }));
        } catch {
          // If parsing fails, return default
        }
      }
    }
    return [
      {
        id: "initial",
        role: "assistant",
        content:
          "Hi! I'm here to help you refine your website. Describe the changes you'd like to make, and I'll generate an updated version for you to review.",
        timestamp: new Date(),
      },
    ];
  });

  const [input, setInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [pendingVersionId, setPendingVersionId] = useState<string | null>(null);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== "undefined" && messages.length > 0) {
      localStorage.setItem(storageKey, JSON.stringify(messages));
    }
  }, [messages, storageKey]);

  const sendRefinementRequest = async (content: string) => {
    if (!content.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsGenerating(true);
    setPendingVersionId(null);

    try {
      const response = await fetch("/api/ai/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: content,
          siteId,
          currentVersionId,
        }),
      });

      if (!response.ok) {
        throw new Error("Refinement failed");
      }

      // Read streaming response (same pattern as ChatInterface!)
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let aiResponse = "";
      const streamingMessageId = `streaming-${Date.now()}`;

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          aiResponse += chunk;

          // Update AI message in real-time
          setMessages((prev) => {
            const lastMessage = prev[prev.length - 1];
            if (lastMessage?.id === streamingMessageId) {
              return [...prev.slice(0, -1), { ...lastMessage, content: aiResponse }];
            } else {
              return [
                ...prev,
                {
                  id: streamingMessageId,
                  role: "assistant" as const,
                  content: aiResponse,
                  timestamp: new Date(),
                },
              ];
            }
          });
        }
      }

      // Finalize message with unique ID
      setMessages((prev) => {
        const withoutStreaming = prev.filter((m) => m.id !== streamingMessageId);
        return [
          ...withoutStreaming,
          {
            id: Date.now().toString(),
            role: "assistant" as const,
            content: aiResponse,
            timestamp: new Date(),
          },
        ];
      });

      // Show apply button (in real implementation, we'd get version ID from response)
      // For now, we'll fetch the latest version after generation
      setPendingVersionId("latest");
      toast.success("Changes generated! Review and apply when ready.");
    } catch (error) {
      toast.error("Failed to generate changes. Please try again.");
      console.error("Refinement error:", error);

      // Add error message
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          content:
            "I encountered an error generating those changes. Could you try rephrasing your request or being more specific?",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApplyChanges = async () => {
    if (!pendingVersionId) return;

    try {
      // Get the latest version for this site
      const response = await fetch(`/api/sites/${siteId}/versions`);
      const versions = await response.json();

      if (versions && versions.length > 0) {
        // Get the most recent version
        const latestVersion = versions[0];
        await onApplyChanges(latestVersion.id);
        setPendingVersionId(null);

        // Add confirmation message
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: "assistant",
            content:
              "✅ Changes applied! The preview has been updated. You can continue refining or close the chat.",
            timestamp: new Date(),
          },
        ]);
      }
    } catch (error) {
      toast.error("Failed to apply changes");
      console.error("Apply error:", error);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white border-r shadow-xl rounded-lg">
      {/* Header */}
      <div className="p-4 border-b bg-gradient-to-r from-blue-50 to-purple-50 flex items-center justify-between rounded-t-lg">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Refine Your Website</h2>
          <p className="text-sm text-gray-600">Describe changes and I&apos;ll update the design</p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            role={message.role}
            content={message.content}
            timestamp={message.timestamp}
          />
        ))}
        {isGenerating && <TypingIndicator />}
      </div>

      {/* Apply Button (shows after generation) */}
      {pendingVersionId && !isGenerating && (
        <div className="p-4 border-t bg-blue-50">
          <Button
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            size="lg"
            onClick={handleApplyChanges}
          >
            ✨ Apply Changes
          </Button>
          <p className="text-xs text-center text-gray-600 mt-2">
            Review the preview, then apply when ready
          </p>
        </div>
      )}

      {/* Input */}
      <div className="border-t bg-white p-4">
        <MessageInput
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onSend={sendRefinementRequest}
          disabled={isGenerating}
          placeholder="Describe the changes you'd like..."
        />
      </div>
    </div>
  );
}
