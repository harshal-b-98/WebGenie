/**
 * Unified Widget Injection Utility
 *
 * Provides consistent injection of chat widget and dynamic navigation scripts.
 * Uses INLINE mode by default to ensure compatibility with blob URL previews.
 *
 * Why inline mode is needed:
 * - Blob URLs (used for iframe previews) cannot load external resources
 * - External script/css tags fail silently in blob context
 * - Inline embedding ensures both chat widget and nav controller work in previews
 */

import fs from "fs";
import path from "path";
import { logger } from "@/lib/utils/logger";

export interface ChatWidgetConfig {
  position?: "bottom-right" | "bottom-left";
  primaryColor?: string;
  welcomeMessage?: string;
}

export type InjectionMode = "inline" | "external";

// File content cache to avoid repeated disk reads
// In development, we disable cache to pick up file changes immediately
const fileCache: Map<string, string> = new Map();
const isDev = process.env.NODE_ENV !== "production";

/**
 * Read and cache file content
 * In development mode, always read fresh to pick up file changes
 */
function getCachedFile(relativePath: string): string {
  // In development, skip cache to pick up file changes immediately
  if (!isDev && fileCache.has(relativePath)) {
    return fileCache.get(relativePath)!;
  }

  try {
    const fullPath = path.join(process.cwd(), relativePath);
    const content = fs.readFileSync(fullPath, "utf-8");
    if (!isDev) {
      fileCache.set(relativePath, content);
    }
    return content;
  } catch (error) {
    logger.error(`Failed to read file: ${relativePath}`, error);
    return `/* Failed to load ${relativePath} */`;
  }
}

/**
 * Clear file cache (useful for development/hot reload)
 */
export function clearInjectionCache(): void {
  fileCache.clear();
}

/**
 * Inject chat widget into HTML
 *
 * @param html - The HTML content to inject into
 * @param siteId - The site ID for widget configuration
 * @param versionId - The version ID for widget configuration
 * @param enabled - Whether the chat widget is enabled
 * @param config - Chat widget configuration
 * @param mode - 'inline' (default) for blob URL compatibility, 'external' for published sites
 */
export function injectChatWidget(
  html: string,
  siteId: string,
  versionId: string,
  enabled: boolean,
  config: ChatWidgetConfig,
  mode: InjectionMode = "inline"
): string {
  if (!enabled) return html;

  // Remove trailing slash to prevent double-slash URLs (e.g., https://example.com//api)
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/+$/, "");
  const position = config.position || "bottom-right";
  const primaryColor = config.primaryColor || "#667eea";
  const welcomeMessage = config.welcomeMessage || "Hi! How can I help you today?";

  let widgetCode: string;

  if (mode === "inline") {
    // INLINE mode: Embed CSS and JS directly in the HTML
    // This is required for blob URL iframes which cannot load external resources
    const widgetCSS = getCachedFile("public/chat-widget/widget.css");
    const widgetJS = getCachedFile("public/chat-widget/widget.js");

    widgetCode = `
<!-- NextGenWeb Chat Widget (Inlined for blob URL compatibility) -->
<style id="nextgenweb-widget-styles">
${widgetCSS}
</style>
<script>
  window.NEXTGENWEB_CONFIG = {
    projectId: '${siteId}',
    versionId: '${versionId}',
    apiEndpoint: '',  // Client-side auto-detects using window.location.origin
    position: '${position}',
    primaryColor: '${primaryColor}',
    welcomeMessage: '${welcomeMessage.replace(/'/g, "\\'")}'
  };
</script>
<script>
${widgetJS}
</script>
<!-- End NextGenWeb Chat Widget -->
`;
  } else {
    // EXTERNAL mode: Use script/link tags with URLs
    // Only use for published sites where external resources can be loaded
    widgetCode = `
<!-- NextGenWeb Chat Widget -->
<link rel="stylesheet" href="${appUrl}/chat-widget/widget.css">
<script>
  window.NEXTGENWEB_CONFIG = {
    projectId: '${siteId}',
    versionId: '${versionId}',
    apiEndpoint: '',  // Client-side auto-detects using window.location.origin
    position: '${position}',
    primaryColor: '${primaryColor}',
    welcomeMessage: '${welcomeMessage.replace(/'/g, "\\'")}'
  };
</script>
<script src="${appUrl}/chat-widget/widget.js" defer></script>
<!-- End NextGenWeb Chat Widget -->
`;
  }

  return injectBeforeBodyClose(html, widgetCode);
}

/**
 * Inject dynamic navigation scripts into HTML
 *
 * @param html - The HTML content to inject into
 * @param siteId - The site ID for navigation configuration
 * @param versionId - The version ID for navigation configuration
 * @param companyName - The company name for branding
 * @param personaDetectionEnabled - Whether persona detection is enabled
 * @param mode - 'inline' (default) for blob URL compatibility, 'external' for published sites
 */
export function injectDynamicNav(
  html: string,
  siteId: string,
  versionId: string,
  companyName: string,
  personaDetectionEnabled: boolean,
  mode: InjectionMode = "inline"
): string {
  // Remove trailing slash to prevent double-slash URLs (e.g., https://example.com//api)
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/+$/, "");

  let navCode: string;

  if (mode === "inline") {
    // INLINE mode: Embed CSS and JS directly
    const navCSS = getCachedFile("public/dynamic-nav/styles.css");
    const navJS = getCachedFile("public/dynamic-nav/nav-controller.js");

    navCode = `
<!-- NextGenWeb Dynamic Navigation (Inlined for blob URL compatibility) -->
<style id="nextgenweb-nav-styles">
${navCSS}
</style>
<script>
  window.NEXTGENWEB_NAV_CONFIG = {
    siteId: '${siteId}',
    versionId: '${versionId}',
    apiEndpoint: '',  // Client-side auto-detects using window.location.origin
    personaDetectionEnabled: ${personaDetectionEnabled},
    companyName: '${companyName.replace(/'/g, "\\'")}'
  };
</script>
<script>
${navJS}
</script>
<!-- End NextGenWeb Dynamic Navigation -->
`;
  } else {
    // EXTERNAL mode: Use script/link tags
    navCode = `
<!-- NextGenWeb Dynamic Navigation -->
<link rel="stylesheet" href="${appUrl}/dynamic-nav/styles.css">
<script>
  window.NEXTGENWEB_NAV_CONFIG = {
    siteId: '${siteId}',
    versionId: '${versionId}',
    apiEndpoint: '',  // Client-side auto-detects using window.location.origin
    personaDetectionEnabled: ${personaDetectionEnabled},
    companyName: '${companyName.replace(/'/g, "\\'")}'
  };
</script>
<script src="${appUrl}/dynamic-nav/nav-controller.js" defer></script>
<!-- End NextGenWeb Dynamic Navigation -->
`;
  }

  return injectBeforeBodyClose(html, navCode);
}

/**
 * Inject both chat widget and dynamic nav in one call
 * This is a convenience function for common use cases
 */
export function injectAllWidgets(
  html: string,
  siteId: string,
  versionId: string,
  companyName: string,
  options: {
    chatEnabled?: boolean;
    chatConfig?: ChatWidgetConfig;
    dynamicNavEnabled?: boolean;
    personaDetectionEnabled?: boolean;
    mode?: InjectionMode;
  } = {}
): string {
  const {
    chatEnabled = true,
    chatConfig = {},
    dynamicNavEnabled = true,
    personaDetectionEnabled = false,
    mode = "inline",
  } = options;

  let result = html;

  // Inject dynamic nav first (it needs to be loaded before chat widget)
  if (dynamicNavEnabled) {
    result = injectDynamicNav(
      result,
      siteId,
      versionId,
      companyName,
      personaDetectionEnabled,
      mode
    );
  }

  // Then inject chat widget
  if (chatEnabled) {
    result = injectChatWidget(result, siteId, versionId, true, chatConfig, mode);
  }

  return result;
}

/**
 * Helper to inject code before </body> tag
 */
function injectBeforeBodyClose(html: string, code: string): string {
  if (html.includes("</body>")) {
    return html.replace("</body>", `${code}</body>`);
  }
  if (html.includes("</html>")) {
    return html.replace("</html>", `${code}</body></html>`);
  }
  // Fallback: append at end
  return html + code;
}
