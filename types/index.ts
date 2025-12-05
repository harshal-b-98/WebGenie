export type Role = "user" | "ai";

export type ContentType = "text" | "hero" | "features" | "pricing" | "form";

export interface ContentSection {
  id: string;
  type: ContentType;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any; // Using any for flexibility in this prototype
}

export interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: number;
}

export interface ChatState {
  messages: Message[];
  isTyping: boolean;
}
