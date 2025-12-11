/**
 * Persona Detection Service
 *
 * Manages visitor sessions and persona detection for personalized content.
 * Tracks visitor behavior signals and determines likely persona types.
 */

import { createClient } from "@/lib/db/server";
import { logger } from "@/lib/utils/logger";
import {
  detectPersona,
  calculatePersonaScores,
  type PersonaType,
  type PersonaSignals,
} from "@/lib/ai/prompts/personas";

export interface SessionData {
  id: string;
  siteId: string;
  sessionToken: string;
  detectedPersona: PersonaType | null;
  personaConfidence: number;
  behaviorSignals: PersonaSignals;
  createdAt: string;
  lastActivityAt: string;
  expiresAt: string;
}

/**
 * Create or get a visitor session
 */
export async function getOrCreateSession(
  siteId: string,
  sessionToken: string
): Promise<SessionData> {
  const supabase = await createClient();

  // Check if session exists
  const { data: existingSession } = await supabase
    .from("visitor_sessions")
    .select("*")
    .eq("session_token", sessionToken)
    .single();

  if (existingSession) {
    // Update last activity
    await supabase
      .from("visitor_sessions")
      .update({
        last_activity_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      } as never)
      .eq("session_token", sessionToken);

    const session = existingSession as {
      id: string;
      site_id: string;
      session_token: string;
      detected_persona: string | null;
      persona_confidence: number | null;
      behavior_signals: PersonaSignals | null;
      created_at: string;
      last_activity_at: string;
      expires_at: string;
    };

    return {
      id: session.id,
      siteId: session.site_id,
      sessionToken: session.session_token,
      detectedPersona: session.detected_persona as PersonaType | null,
      personaConfidence: session.persona_confidence || 0,
      behaviorSignals: session.behavior_signals || {
        pagesVisited: [],
        timeOnSections: {},
        clickedElements: [],
        scrollDepth: {},
      },
      createdAt: session.created_at,
      lastActivityAt: session.last_activity_at,
      expiresAt: session.expires_at,
    };
  }

  // Create new session
  const { data: newSession, error } = await supabase
    .from("visitor_sessions")
    .insert({
      site_id: siteId,
      session_token: sessionToken,
      behavior_signals: {
        pagesVisited: [],
        timeOnSections: {},
        clickedElements: [],
        scrollDepth: {},
      },
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    } as never)
    .select()
    .single();

  if (error || !newSession) {
    logger.error("Failed to create visitor session", { error, siteId, sessionToken });
    throw new Error("Failed to create session");
  }

  logger.info("Created new visitor session", {
    siteId,
    sessionToken: sessionToken.substring(0, 10),
  });

  const created = newSession as {
    id: string;
    site_id: string;
    session_token: string;
    created_at: string;
    last_activity_at: string;
    expires_at: string;
  };

  return {
    id: created.id,
    siteId: created.site_id,
    sessionToken: created.session_token,
    detectedPersona: null,
    personaConfidence: 0,
    behaviorSignals: {
      pagesVisited: [],
      timeOnSections: {},
      clickedElements: [],
      scrollDepth: {},
    },
    createdAt: created.created_at,
    lastActivityAt: created.last_activity_at,
    expiresAt: created.expires_at,
  };
}

/**
 * Update session with new behavior signals and re-detect persona
 */
export async function updateSessionBehavior(
  sessionToken: string,
  newSignals: Partial<PersonaSignals>,
  confidenceThreshold = 0.3
): Promise<{ persona: PersonaType; confidence: number }> {
  const supabase = await createClient();

  // Get current session
  const { data: session } = await supabase
    .from("visitor_sessions")
    .select("*")
    .eq("session_token", sessionToken)
    .single();

  if (!session) {
    throw new Error("Session not found");
  }

  const sessionData = session as { behavior_signals: PersonaSignals | null };

  // Merge new signals with existing
  const existingSignals = sessionData.behavior_signals || {
    pagesVisited: [],
    timeOnSections: {},
    clickedElements: [],
    scrollDepth: {},
  };

  const mergedSignals: PersonaSignals = {
    pagesVisited: [
      ...new Set([...existingSignals.pagesVisited, ...(newSignals.pagesVisited || [])]),
    ],
    timeOnSections: { ...existingSignals.timeOnSections, ...newSignals.timeOnSections },
    clickedElements: [
      ...new Set([...existingSignals.clickedElements, ...(newSignals.clickedElements || [])]),
    ],
    scrollDepth: { ...existingSignals.scrollDepth, ...newSignals.scrollDepth },
    searchQueries: [
      ...new Set([...(existingSignals.searchQueries || []), ...(newSignals.searchQueries || [])]),
    ],
  };

  // Detect persona from merged signals
  const detection = detectPersona(mergedSignals, confidenceThreshold);

  // Update session
  await supabase
    .from("visitor_sessions")
    .update({
      behavior_signals: mergedSignals,
      detected_persona: detection.persona,
      persona_confidence: detection.confidence,
      last_activity_at: new Date().toISOString(),
    } as never)
    .eq("session_token", sessionToken);

  logger.info("Updated session behavior", {
    sessionToken: sessionToken.substring(0, 10),
    persona: detection.persona,
    confidence: detection.confidence,
    signalCount: {
      pages: mergedSignals.pagesVisited.length,
      clicks: mergedSignals.clickedElements.length,
    },
  });

  return detection;
}

/**
 * Get persona scores breakdown for debugging/analytics
 */
export function getPersonaScoresBreakdown(signals: PersonaSignals): {
  scores: Record<PersonaType, number>;
  signals: PersonaSignals;
  recommendation: PersonaType;
  confidence: number;
} {
  const scores = calculatePersonaScores(signals);
  const detection = detectPersona(signals);

  return {
    scores,
    signals,
    recommendation: detection.persona,
    confidence: detection.confidence,
  };
}

/**
 * Get analytics for site's visitor personas
 */
export async function getPersonaAnalytics(siteId: string): Promise<{
  totalSessions: number;
  personaDistribution: Record<PersonaType, number>;
  recentSessions: SessionData[];
}> {
  const supabase = await createClient();

  // Get all sessions for site
  const { data: sessions } = await supabase
    .from("visitor_sessions")
    .select("*")
    .eq("site_id", siteId)
    .order("last_activity_at", { ascending: false })
    .limit(100);

  if (!sessions) {
    return {
      totalSessions: 0,
      personaDistribution: {
        developer: 0,
        executive: 0,
        buyer: 0,
        end_user: 0,
        general: 0,
      },
      recentSessions: [],
    };
  }

  // Calculate persona distribution
  const distribution: Record<PersonaType, number> = {
    developer: 0,
    executive: 0,
    buyer: 0,
    end_user: 0,
    general: 0,
  };

  type SessionRow = {
    id: string;
    site_id: string;
    session_token: string;
    detected_persona: string | null;
    persona_confidence: number | null;
    behavior_signals: PersonaSignals | null;
    created_at: string;
    last_activity_at: string;
    expires_at: string;
  };

  (sessions as SessionRow[]).forEach((s) => {
    const persona = (s.detected_persona as PersonaType) || "general";
    distribution[persona]++;
  });

  // Map recent sessions
  const recentSessions: SessionData[] = (sessions as SessionRow[]).slice(0, 10).map((s) => ({
    id: s.id,
    siteId: s.site_id,
    sessionToken: s.session_token,
    detectedPersona: s.detected_persona as PersonaType | null,
    personaConfidence: s.persona_confidence || 0,
    behaviorSignals: s.behavior_signals || {
      pagesVisited: [],
      timeOnSections: {},
      clickedElements: [],
      scrollDepth: {},
    },
    createdAt: s.created_at,
    lastActivityAt: s.last_activity_at,
    expiresAt: s.expires_at,
  }));

  return {
    totalSessions: sessions.length,
    personaDistribution: distribution,
    recentSessions,
  };
}

/**
 * Clean up expired sessions
 */
export async function cleanupExpiredSessions(): Promise<number> {
  const supabase = await createClient();

  // Count before delete
  const { count: expiredCount } = await supabase
    .from("visitor_sessions")
    .select("*", { count: "exact", head: true })
    .lt("expires_at", new Date().toISOString());

  // Delete expired sessions
  await supabase.from("visitor_sessions").delete().lt("expires_at", new Date().toISOString());

  logger.info("Cleaned up expired sessions", { count: expiredCount });

  return expiredCount || 0;
}
