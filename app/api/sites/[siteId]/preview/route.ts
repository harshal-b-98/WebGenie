import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/server";
import { createClient } from "@/lib/db/server";
import { formatErrorResponse } from "@/lib/utils/errors";
import {
  injectChatWidget,
  injectDynamicNav,
  ChatWidgetConfig,
} from "@/lib/services/generation-service";

interface SiteSettings {
  id: string;
  title?: string;
  current_version_id?: string | null;
  dynamic_pages_enabled?: boolean;
  persona_detection_enabled?: boolean;
  chat_widget_enabled?: boolean;
  chat_widget_config?: ChatWidgetConfig;
}

/**
 * Strip ALL existing widget injections from HTML (both chat widget and nav controller)
 * This allows re-injection with the latest fixed versions.
 *
 * IMPORTANT: The old nav-controller.js had a bug where </script> inside string literals
 * broke the HTML parser. This caused the script to be cut off and the rest to appear
 * as raw text. This function strips EVERYTHING from the first widget marker to </body>.
 */
function stripAllWidgetInjections(html: string): string {
  // Find the FIRST occurrence of either widget config
  const navConfigStart = html.indexOf("NEXTGENWEB_NAV_CONFIG");
  const chatConfigStart = html.indexOf("NEXTGENWEB_CONFIG");

  // Determine which comes first (if both exist)
  let firstConfigStart = -1;
  if (navConfigStart !== -1 && chatConfigStart !== -1) {
    firstConfigStart = Math.min(navConfigStart, chatConfigStart);
  } else if (navConfigStart !== -1) {
    firstConfigStart = navConfigStart;
  } else if (chatConfigStart !== -1) {
    firstConfigStart = chatConfigStart;
  }

  if (firstConfigStart === -1) {
    return html; // No widget config found, nothing to strip
  }

  // Find the <script or <style tag that starts the widget injection
  // Look for common widget markers
  const beforeConfig = html.substring(0, firstConfigStart);

  // Find the start of widget injection - could be a style or script tag
  // Look for NextGenWeb comment markers first
  let injectionStart = beforeConfig.lastIndexOf("<!-- NextGenWeb");
  if (injectionStart === -1) {
    // Fallback: find the script tag containing the config
    injectionStart = beforeConfig.lastIndexOf("<script");
  }
  if (injectionStart === -1) {
    // Fallback: find any style tag with nextgenweb id
    injectionStart = beforeConfig.lastIndexOf('<style id="nextgenweb');
  }

  if (injectionStart === -1) {
    return html; // Can't find injection start, return as-is
  }

  // Find </body> - it should be at the end
  // Due to corruption, we might have raw text before </body>
  const bodyEndMatch = html.match(/<\/body>/i);
  if (!bodyEndMatch || bodyEndMatch.index === undefined) {
    // No </body> found - the HTML might be severely corrupted
    // Try to find </html> instead
    const htmlEndMatch = html.match(/<\/html>/i);
    if (htmlEndMatch && htmlEndMatch.index !== undefined) {
      return html.substring(0, injectionStart) + "</body>" + html.substring(htmlEndMatch.index);
    }
    return html; // Can't safely strip
  }

  // Keep everything before the widget injection, and from </body> onwards
  const result = html.substring(0, injectionStart) + html.substring(bodyEndMatch.index);

  return result;
}

/**
 * Dynamically inject widgets into HTML
 * ALWAYS strips ALL old widget injections and re-injects fresh versions
 * This fixes the </script> escaping bug in older stored HTML
 */
function ensureWidgetsInjected(
  html: string,
  siteId: string,
  versionId: string,
  settings: SiteSettings
): string {
  // ALWAYS strip ALL existing widget injections to remove any corrupted HTML
  // This is necessary because old versions had a bug where </script> in JS
  // broke the HTML parser and corrupted everything after it
  let enhancedHtml = stripAllWidgetInjections(html);

  const dynamicPagesEnabled = settings.dynamic_pages_enabled ?? true;
  const chatWidgetEnabled = settings.chat_widget_enabled ?? true;

  // Re-inject chat widget first (it should come before nav controller in DOM order)
  if (chatWidgetEnabled) {
    const chatWidgetConfig = settings.chat_widget_config || {};
    enhancedHtml = injectChatWidget(
      enhancedHtml,
      siteId,
      versionId,
      chatWidgetEnabled,
      chatWidgetConfig
    );
  }

  // Then inject dynamic nav controller
  if (dynamicPagesEnabled) {
    const personaDetectionEnabled = settings.persona_detection_enabled ?? false;
    const companyName = settings.title || "Company";
    enhancedHtml = injectDynamicNav(
      enhancedHtml,
      siteId,
      versionId,
      companyName,
      personaDetectionEnabled
    );
  }

  return enhancedHtml;
}

export async function GET(request: Request, { params }: { params: Promise<{ siteId: string }> }) {
  try {
    const user = await requireUser();
    const { siteId } = await params;

    // Get version ID from query params (optional)
    const { searchParams } = new URL(request.url);
    const versionId = searchParams.get("version");

    const supabase = await createClient();

    // Get site settings for widget injection
    const { data: siteSettings } = await supabase
      .from("sites")
      .select(
        "id, title, current_version_id, dynamic_pages_enabled, persona_detection_enabled, chat_widget_enabled, chat_widget_config"
      )
      .eq("id", siteId)
      .eq("user_id", user.id)
      .single();

    if (!siteSettings) {
      return NextResponse.json({ htmlContent: null });
    }

    const settings = siteSettings as SiteSettings;

    // If specific version requested, load that version
    if (versionId) {
      // Verify user owns the site for this version
      const { data: version } = await supabase
        .from("site_versions")
        .select("html_content, site_id")
        .eq("id", versionId)
        .single();

      if (!version) {
        return NextResponse.json({ htmlContent: null });
      }

      const versionData = version as { html_content?: string; site_id: string };

      // Verify site matches
      if (versionData.site_id !== siteId) {
        return NextResponse.json({ htmlContent: null }, { status: 403 });
      }

      // Ensure widgets are injected
      const enhancedHtml = versionData.html_content
        ? ensureWidgetsInjected(versionData.html_content, siteId, versionId, settings)
        : null;

      return NextResponse.json({
        htmlContent: enhancedHtml,
      });
    }

    // Otherwise, load current version
    if (!settings.current_version_id) {
      return NextResponse.json({ htmlContent: null });
    }

    // Get version content
    const { data: version } = await supabase
      .from("site_versions")
      .select("html_content")
      .eq("id", settings.current_version_id)
      .single();

    const versionData = version as { html_content?: string } | null;

    // Ensure widgets are injected
    const enhancedHtml = versionData?.html_content
      ? ensureWidgetsInjected(
          versionData.html_content,
          siteId,
          settings.current_version_id,
          settings
        )
      : null;

    return NextResponse.json({
      htmlContent: enhancedHtml,
    });
  } catch (error) {
    return NextResponse.json(formatErrorResponse(error), { status: 500 });
  }
}
