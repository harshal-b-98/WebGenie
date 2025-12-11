import { Vibrant } from "node-vibrant/node";

export interface ExtractedColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
  muted: string;
}

/**
 * Convert RGB to hex color
 */
function rgbToHex(r: number, g: number, b: number): string {
  return (
    "#" +
    [r, g, b]
      .map((x) => {
        const hex = Math.round(x).toString(16);
        return hex.length === 1 ? "0" + hex : hex;
      })
      .join("")
  );
}

/**
 * Get a lighter version of a color
 */
function lightenColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, (num >> 16) + amt);
  const G = Math.min(255, ((num >> 8) & 0x00ff) + amt);
  const B = Math.min(255, (num & 0x0000ff) + amt);
  return "#" + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
}

/**
 * Get a darker version of a color
 */
function darkenColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.max(0, (num >> 16) - amt);
  const G = Math.max(0, ((num >> 8) & 0x00ff) - amt);
  const B = Math.max(0, (num & 0x0000ff) - amt);
  return "#" + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
}

/**
 * Determine if a color is light or dark
 */
function isLightColor(hex: string): boolean {
  const num = parseInt(hex.replace("#", ""), 16);
  const R = num >> 16;
  const G = (num >> 8) & 0x00ff;
  const B = num & 0x0000ff;
  const luminance = (0.299 * R + 0.587 * G + 0.114 * B) / 255;
  return luminance > 0.5;
}

/**
 * Extract dominant colors from an image URL
 * @param imageUrl The URL of the image to analyze
 * @returns Extracted color palette suitable for website theming
 */
export async function extractColorsFromImage(imageUrl: string): Promise<ExtractedColors | null> {
  try {
    // Fetch the image
    const response = await fetch(imageUrl);
    if (!response.ok) {
      console.error("Failed to fetch image:", response.status);
      return null;
    }

    const buffer = await response.arrayBuffer();
    const palette = await Vibrant.from(Buffer.from(buffer)).getPalette();

    // Extract colors from the palette
    const vibrant = palette.Vibrant?.hex || "#3B82F6"; // Default blue
    const darkVibrant = palette.DarkVibrant?.hex || darkenColor(vibrant, 20);
    const lightVibrant = palette.LightVibrant?.hex || lightenColor(vibrant, 20);
    const muted = palette.Muted?.hex || "#6B7280";
    const darkMuted = palette.DarkMuted?.hex || "#374151";
    const lightMuted = palette.LightMuted?.hex || "#F3F4F6";

    // Determine if primary color is light or dark to choose appropriate text color
    const primaryIsLight = isLightColor(vibrant);

    return {
      primary: vibrant,
      secondary: darkVibrant,
      accent: lightVibrant,
      background: lightMuted,
      text: primaryIsLight ? darkMuted : "#FFFFFF",
      muted: muted,
    };
  } catch (error) {
    console.error("Error extracting colors from image:", error);
    return null;
  }
}

/**
 * Generate CSS custom properties from extracted colors
 */
export function generateColorCSS(colors: ExtractedColors): string {
  return `
    --color-primary: ${colors.primary};
    --color-secondary: ${colors.secondary};
    --color-accent: ${colors.accent};
    --color-background: ${colors.background};
    --color-text: ${colors.text};
    --color-muted: ${colors.muted};
  `;
}

/**
 * Darken a color by mixing with black
 */
function darkenForBackground(hex: string): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const R = Math.max(0, Math.floor((num >> 16) * 0.4));
  const G = Math.max(0, Math.floor(((num >> 8) & 0x00ff) * 0.4));
  const B = Math.max(0, Math.floor((num & 0x0000ff) * 0.4));
  return "#" + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
}

/**
 * Generate Tailwind-compatible color values for prompt injection
 */
export function generateColorPrompt(colors: ExtractedColors): string {
  return `
BRAND COLOR PALETTE (extracted from logo):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Primary Brand Color: ${colors.primary} - Use ONLY for buttons, links, icons, accents
Secondary Brand Color: ${colors.secondary} - Use for hover states, secondary accents

🚨🚨🚨 MANDATORY HERO SECTION STYLING - DO NOT IGNORE 🚨🚨🚨
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

THE HERO SECTION MUST USE THIS EXACT STYLING:

<section class="min-h-screen bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900 relative">
  <!-- Hero content with WHITE text only -->
  <h1 class="text-white text-5xl md:text-6xl lg:text-7xl font-bold">...</h1>
  <p class="text-gray-200 text-xl md:text-2xl">...</p>
  <button class="bg-[${colors.primary}] text-white px-8 py-4 rounded-lg font-semibold">Primary CTA</button>
  <button class="bg-white text-gray-900 px-8 py-4 rounded-lg font-semibold">Secondary CTA</button>
</section>

REQUIRED HERO CLASSES:
- Hero section background: bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900
- Main headline: text-white text-5xl md:text-6xl lg:text-7xl font-bold
- Subheadline: text-gray-200 text-xl md:text-2xl
- Primary button: bg-[${colors.primary}] text-white px-8 py-4 rounded-lg font-semibold shadow-lg
- Secondary button: bg-white text-gray-900 px-8 py-4 rounded-lg font-semibold

⛔ FORBIDDEN - WILL CAUSE INVISIBLE TEXT:
- DO NOT use light colors (orange, yellow, beige, peach, cream) as hero background
- DO NOT use brand colors directly as hero background - they are too light
- DO NOT use text-gray-500 or darker gray text on hero - use text-white or text-gray-200 ONLY
- DO NOT use outline/transparent buttons on gradient backgrounds

✅ OTHER SECTIONS (non-hero):
- Feature cards: bg-white with shadow-lg
- Section headings: text-gray-900 font-bold
- Body text: text-gray-600 or text-gray-700
- Buttons/links: text-[${colors.primary}] or bg-[${colors.primary}] text-white
- Footer: bg-gray-900 text-white
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
}
