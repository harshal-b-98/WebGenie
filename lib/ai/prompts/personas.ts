/**
 * Persona Detection and Persona-Aware Prompt Generation
 *
 * Defines visitor personas and how to adapt content for each.
 * Used to personalize dynamically generated pages based on visitor behavior.
 */

export type PersonaType = "developer" | "executive" | "buyer" | "end_user" | "general";

export interface PersonaSignals {
  pagesVisited: string[];
  timeOnSections: Record<string, number>;
  clickedElements: string[];
  scrollDepth: Record<string, number>;
  searchQueries?: string[];
}

export interface PersonaDefinition {
  type: PersonaType;
  name: string;
  description: string;
  emphasis: string[];
  tone: string;
  ctas: string[];
  contentFocus: string[];
}

/**
 * Persona definitions with their characteristics
 */
export const PERSONA_DEFINITIONS: Record<PersonaType, PersonaDefinition> = {
  developer: {
    type: "developer",
    name: "Developer / Technical User",
    description: "Technical professionals evaluating the product for implementation",
    emphasis: [
      "API documentation and code examples",
      "Integration guides and SDKs",
      "Technical architecture details",
      "Performance metrics and benchmarks",
      "Security and compliance details",
    ],
    tone: "Precise, technical, direct. Use technical jargon where appropriate.",
    ctas: ["View API Docs", "Get API Key", "Try Sandbox", "View Code Examples"],
    contentFocus: [
      "technical specifications",
      "code snippets",
      "architecture diagrams",
      "performance data",
    ],
  },
  executive: {
    type: "executive",
    name: "Executive / Decision Maker",
    description: "Business leaders evaluating strategic value and ROI",
    emphasis: [
      "ROI and business impact",
      "Strategic advantages",
      "Case studies with metrics",
      "Competitive differentiation",
      "Enterprise features",
    ],
    tone: "Business-focused, strategic, concise. Focus on value and outcomes.",
    ctas: ["Schedule Demo", "View Case Studies", "Talk to Sales", "Download ROI Report"],
    contentFocus: [
      "business outcomes",
      "ROI metrics",
      "customer success stories",
      "competitive advantages",
    ],
  },
  buyer: {
    type: "buyer",
    name: "Buyer / Procurement",
    description: "Professionals focused on pricing, contracts, and vendor evaluation",
    emphasis: [
      "Pricing and plans",
      "Contract terms",
      "Vendor comparison",
      "Compliance certifications",
      "Support SLAs",
    ],
    tone: "Clear, comparison-friendly, detailed on terms and conditions.",
    ctas: ["View Pricing", "Get Quote", "Compare Plans", "Download Datasheet"],
    contentFocus: ["pricing details", "plan comparisons", "compliance info", "support details"],
  },
  end_user: {
    type: "end_user",
    name: "End User / Practitioner",
    description: "Daily users focused on ease of use and workflows",
    emphasis: [
      "Ease of use and simplicity",
      "Step-by-step workflows",
      "Time-saving features",
      "Collaboration capabilities",
      "Training and onboarding",
    ],
    tone: "Friendly, helpful, focused on simplicity and quick wins.",
    ctas: ["Start Free Trial", "Watch Tutorial", "See How It Works", "Get Started"],
    contentFocus: ["user workflows", "time savings", "ease of use", "collaboration"],
  },
  general: {
    type: "general",
    name: "General Visitor",
    description: "Visitors whose intent is not yet clear",
    emphasis: [
      "Balanced overview",
      "Key benefits",
      "Popular features",
      "Getting started options",
      "Multiple paths forward",
    ],
    tone: "Balanced, informative, welcoming. Cover multiple perspectives.",
    ctas: ["Learn More", "Get Started", "Request Demo", "Explore Features"],
    contentFocus: ["overview", "key benefits", "popular features", "flexible next steps"],
  },
};

/**
 * Generate persona-specific prompt injection for content generation
 */
export function getPersonaEmphasis(persona: PersonaType): string {
  const def = PERSONA_DEFINITIONS[persona];

  return `
PERSONA ADAPTATION:
Detected Visitor Type: ${def.name}
Description: ${def.description}

CONTENT EMPHASIS (prioritize these topics):
${def.emphasis.map((e, i) => `${i + 1}. ${e}`).join("\n")}

TONE & LANGUAGE:
${def.tone}

RECOMMENDED CTAs (use these button labels):
${def.ctas.map((cta) => `- "${cta}"`).join("\n")}

CONTENT FOCUS:
Focus more on: ${def.contentFocus.join(", ")}

Adapt the generated content to resonate with this visitor type while maintaining accuracy.
`;
}

/**
 * Detection signals and their persona associations
 */
export const PERSONA_DETECTION_RULES = {
  // Page visit patterns
  pagePatterns: {
    developer: ["platform", "api", "docs", "technical", "integration"],
    executive: ["solutions", "case-studies", "roi", "enterprise"],
    buyer: ["pricing", "plans", "compare", "quote"],
    end_user: ["features", "how-it-works", "tutorials", "getting-started"],
  },

  // Click element patterns
  clickPatterns: {
    developer: ["api", "code", "sdk", "documentation", "github"],
    executive: ["demo", "case-study", "contact-sales", "enterprise"],
    buyer: ["pricing", "quote", "compare", "download"],
    end_user: ["trial", "tutorial", "start", "learn"],
  },

  // Time thresholds (seconds spent on section indicates interest)
  timeThresholds: {
    high: 30, // 30+ seconds = high interest
    medium: 15, // 15-30 seconds = moderate interest
    low: 5, // 5-15 seconds = low interest
  },
};

/**
 * Calculate persona scores based on visitor signals
 */
export function calculatePersonaScores(signals: PersonaSignals): Record<PersonaType, number> {
  const scores: Record<PersonaType, number> = {
    developer: 0,
    executive: 0,
    buyer: 0,
    end_user: 0,
    general: 0.2, // Small base score for general
  };

  // Score based on pages visited
  signals.pagesVisited.forEach((page) => {
    const pageLower = page.toLowerCase();
    Object.entries(PERSONA_DETECTION_RULES.pagePatterns).forEach(([persona, patterns]) => {
      if (patterns.some((p) => pageLower.includes(p))) {
        scores[persona as PersonaType] += 0.3;
      }
    });
  });

  // Score based on clicked elements
  signals.clickedElements.forEach((element) => {
    const elementLower = element.toLowerCase();
    Object.entries(PERSONA_DETECTION_RULES.clickPatterns).forEach(([persona, patterns]) => {
      if (patterns.some((p) => elementLower.includes(p))) {
        scores[persona as PersonaType] += 0.25;
      }
    });
  });

  // Score based on time spent
  Object.entries(signals.timeOnSections).forEach(([section, time]) => {
    const sectionLower = section.toLowerCase();
    if (time >= PERSONA_DETECTION_RULES.timeThresholds.high) {
      Object.entries(PERSONA_DETECTION_RULES.pagePatterns).forEach(([persona, patterns]) => {
        if (patterns.some((p) => sectionLower.includes(p))) {
          scores[persona as PersonaType] += 0.4;
        }
      });
    }
  });

  // Normalize scores
  const total = Object.values(scores).reduce((a, b) => a + b, 0);
  if (total > 0) {
    Object.keys(scores).forEach((persona) => {
      scores[persona as PersonaType] /= total;
    });
  }

  return scores;
}

/**
 * Detect the most likely persona based on signals
 */
export function detectPersona(
  signals: PersonaSignals,
  confidenceThreshold = 0.3
): {
  persona: PersonaType;
  confidence: number;
} {
  const scores = calculatePersonaScores(signals);

  // Find the highest scoring persona
  let maxPersona: PersonaType = "general";
  let maxScore = 0;

  Object.entries(scores).forEach(([persona, score]) => {
    if (score > maxScore && persona !== "general") {
      maxScore = score;
      maxPersona = persona as PersonaType;
    }
  });

  // If confidence is below threshold, return general
  if (maxScore < confidenceThreshold) {
    return { persona: "general", confidence: scores.general };
  }

  return { persona: maxPersona, confidence: maxScore };
}
