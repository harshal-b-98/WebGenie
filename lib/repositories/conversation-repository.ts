import { createClient } from "@/lib/db/server";
import { Database } from "@/lib/db/types";
import { DatabaseError } from "@/lib/utils/errors";
import { logger } from "@/lib/utils/logger";

type Conversation = Database["public"]["Tables"]["conversations"]["Row"];
type Message = Database["public"]["Tables"]["messages"]["Row"];

export async function createConversation(
  siteId: string,
  userId: string,
  type: "clarification" | "generation" | "refinement"
): Promise<Conversation> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("conversations")
    .insert({
      site_id: siteId,
      user_id: userId,
      conversation_type: type,
      status: "active",
    } as never)
    .select()
    .single();

  if (error) {
    logger.error("Failed to create conversation", error, { siteId, userId, type });
    throw new DatabaseError("Failed to create conversation");
  }

  logger.info("Conversation created", { conversationId: (data as Conversation).id, type });
  return data as Conversation;
}

export async function getConversation(conversationId: string): Promise<Conversation | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .eq("id", conversationId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    logger.error("Failed to get conversation", error, { conversationId });
    throw new DatabaseError("Failed to get conversation");
  }

  return data;
}

export async function getActiveConversationForSite(
  siteId: string,
  type: "clarification" | "generation" | "refinement"
): Promise<Conversation | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .eq("site_id", siteId)
    .eq("conversation_type", type)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    logger.error("Failed to get active conversation", error, { siteId, type });
    throw new DatabaseError("Failed to get active conversation");
  }

  return data;
}

export async function updateConversationStatus(
  conversationId: string,
  status: "active" | "completed" | "abandoned"
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("conversations")
    .update({ status } as never)
    .eq("id", conversationId);

  if (error) {
    logger.error("Failed to update conversation status", error, { conversationId, status });
    throw new DatabaseError("Failed to update conversation status");
  }

  logger.info("Conversation status updated", { conversationId, status });
}

export async function addMessage(
  conversationId: string,
  role: "user" | "assistant" | "system",
  content: string,
  tokensUsed?: number
): Promise<Message> {
  const supabase = await createClient();

  // Get the next sequence number
  const { count } = await supabase
    .from("messages")
    .select("*", { count: "exact", head: true })
    .eq("conversation_id", conversationId);

  const sequenceNumber = (count || 0) + 1;

  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      role,
      content,
      sequence_number: sequenceNumber,
      tokens_used: tokensUsed || null,
    } as never)
    .select()
    .single();

  if (error) {
    logger.error("Failed to add message", error, { conversationId, role });
    throw new DatabaseError("Failed to add message");
  }

  return data as Message;
}

export async function getMessages(conversationId: string): Promise<Message[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("sequence_number", { ascending: true });

  if (error) {
    logger.error("Failed to get messages", error, { conversationId });
    throw new DatabaseError("Failed to get messages");
  }

  return data;
}
