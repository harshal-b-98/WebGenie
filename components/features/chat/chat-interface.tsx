"use client";

import { useEffect, useRef, useState } from "react";
import { MessageBubble } from "./message-bubble";
import { MessageInput } from "./message-input";
import { TypingIndicator } from "./typing-indicator";
import { ChatProgress } from "./chat-progress";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: Date;
}

interface ChatInterfaceProps {
  siteId: string;
  conversationId?: string;
  onComplete?: () => void;
}

export function ChatInterface({ siteId, conversationId }: ChatInterfaceProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentConversationId] = useState(conversationId);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Load initial message
  useEffect(() => {
    if (!conversationId) {
      setMessages([
        {
          id: "initial",
          role: "assistant",
          content:
            "Hi! I'm here to help you build your website. Let's start with a simple question: What type of website would you like to create?",
          createdAt: new Date(),
        },
      ]);
    }
  }, [conversationId]);

  const sendMessage = async (content: string) => {
    if (!content.trim()) return;

    // Add user message to UI
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content,
      createdAt: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: content,
          siteId,
          conversationId: currentConversationId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      // Read streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let aiResponse = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          aiResponse += chunk;

          // Update AI message in real-time
          setMessages((prev) => {
            const lastMessage = prev[prev.length - 1];
            if (lastMessage && lastMessage.role === "assistant" && lastMessage.id === "streaming") {
              return [...prev.slice(0, -1), { ...lastMessage, content: aiResponse }];
            } else {
              return [
                ...prev,
                {
                  id: "streaming",
                  role: "assistant" as const,
                  content: aiResponse,
                  createdAt: new Date(),
                },
              ];
            }
          });
        }
      }

      // Finalize the message
      setMessages((prev) => {
        const withoutStreaming = prev.filter((m) => m.id !== "streaming");
        return [
          ...withoutStreaming,
          {
            id: Date.now().toString(),
            role: "assistant" as const,
            content: aiResponse,
            createdAt: new Date(),
          },
        ];
      });
    } catch (error) {
      toast.error("Failed to send message");
      console.error("Chat error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const userMessageCount = messages.filter((m) => m.role === "user").length;

  // Show button if user answered 2+ questions OR if AI said it's ready
  const aiSaidReady = messages.some(
    (m) =>
      m.role === "assistant" &&
      (m.content.toLowerCase().includes("ready to build") ||
        m.content.toLowerCase().includes("generate website") ||
        m.content.toLowerCase().includes("have everything i need") ||
        m.content.toLowerCase().includes("let me build"))
  );

  const showGenerateButton = userMessageCount >= 2 || aiSaidReady;

  return (
    <div className="flex h-full flex-col">
      {/* Progress bar */}
      <div className="border-b border-gray-200 bg-white p-4">
        <div className="space-y-3">
          <ChatProgress current={userMessageCount} total={4} />
          {showGenerateButton && (
            <Button
              className="w-full"
              size="lg"
              onClick={() => {
                // TODO: Navigate to generation page
                window.location.href = `/dashboard/sites/${siteId}/generate`;
              }}
            >
              Generate Website
              <svg className="ml-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </Button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages
          .filter((m) => m.role !== "system")
          .map((message) => (
            <MessageBubble
              key={message.id}
              role={message.role}
              content={message.content}
              timestamp={message.createdAt}
            />
          ))}
        {isLoading && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 bg-white p-4">
        <MessageInput
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onSend={sendMessage}
          disabled={isLoading}
          placeholder="Describe your website..."
        />
      </div>
    </div>
  );
}
