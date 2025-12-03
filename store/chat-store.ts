import { create } from "zustand";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: Date;
}

interface ChatStore {
  messages: Message[];
  isLoading: boolean;
  conversationId: string | null;
  addMessage: (message: Message) => void;
  setMessages: (messages: Message[]) => void;
  setLoading: (loading: boolean) => void;
  setConversationId: (id: string) => void;
  clearMessages: () => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  messages: [],
  isLoading: false,
  conversationId: null,

  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),

  setMessages: (messages) =>
    set({
      messages,
    }),

  setLoading: (loading) =>
    set({
      isLoading: loading,
    }),

  setConversationId: (id) =>
    set({
      conversationId: id,
    }),

  clearMessages: () =>
    set({
      messages: [],
      conversationId: null,
    }),
}));
