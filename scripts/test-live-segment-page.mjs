#!/usr/bin/env node

/**
 * Test Live Segment Page Generation
 *
 * This script generates a fresh segment page and verifies:
 * 1. No "open-chat" buttons exist in the HTML
 * 2. Chat widget is injected correctly
 * 3. Only one CTA button exists
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://cfhssgueszhoracjeyou.supabase.co";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmaHNzZ3Vlc3pob3JhY2pleW91Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDc5MTUzNCwiZXhwIjoyMDgwMzY3NTM0fQ.25FrDBoz5f2bSVaymPTKtetyjD1acfUyQbVhj8en8n8";

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔍 Testing live segment page generation...\n');

// Query for a recently generated segment page
const { data: pages, error } = await supabase
  .from("site_pages")
  .select("*")
  .eq("page_type", "segment")
  .order("created_at", { ascending: false })
  .limit(1);

if (error) {
  console.error('❌ Error fetching segment page:', error);
  process.exit(1);
}

if (!pages || pages.length === 0) {
  console.log('⚠️  No segment pages found in database');
  console.log('   Please generate a segment page first by clicking on a segment in the preview');
  process.exit(0);
}

const page = pages[0];
const html = page.html_content;

console.log('📄 Found segment page:');
console.log(`   Site ID: ${page.site_id}`);
console.log(`   Segment: ${page.page_path}`);
console.log(`   Generated: ${new Date(page.created_at).toLocaleString()}`);
console.log(`   HTML Length: ${html.length} characters`);
console.log();

// Check 1: No "open-chat" buttons
const openChatButtons = html.match(/data-action="open-chat"/g);
if (openChatButtons) {
  console.error('❌ FAIL: Found', openChatButtons.length, '"open-chat" buttons in generated HTML');
  console.error('   This means old cached version or code not deployed');
} else {
  console.log('✅ PASS: No "open-chat" buttons found');
}

// Check 2: Widget injection present
const hasWidgetConfig = html.includes('NEXTGENWEB_CONFIG');
const hasWidgetStyles = html.includes('nextgenweb-widget-styles');
if (hasWidgetConfig && hasWidgetStyles) {
  console.log('✅ PASS: Chat widget is injected correctly');
} else {
  console.error('❌ FAIL: Chat widget injection missing');
  console.error(`   Has config: ${hasWidgetConfig}, Has styles: ${hasWidgetStyles}`);
}

// Check 3: CTA section analysis
const ctaMatches = html.match(/Ready to Get Started\?[\s\S]{0,500}<a href="#" data-action="cta-primary"/g);
if (ctaMatches) {
  const ctaSection = ctaMatches[0];
  const buttonCount = (ctaSection.match(/<a href="#"/g) || []).length;
  if (buttonCount === 1) {
    console.log('✅ PASS: CTA section has exactly 1 button');
  } else {
    console.error('❌ FAIL: CTA section has', buttonCount, 'buttons (expected 1)');
  }
}

// Check 4: Footer "Chat with Us" link
if (html.includes('Chat with Us')) {
  console.error('❌ FAIL: Footer still contains "Chat with Us" link');
} else {
  console.log('✅ PASS: Footer has no "Chat with Us" link');
}

console.log('\n📊 Analysis complete');

if (openChatButtons || !hasWidgetConfig || !hasWidgetStyles) {
  console.log('\n⚠️  ISSUE DETECTED:');
  console.log('   The segment page in the database appears to be an OLD cached version.');
  console.log('   Run: node scripts/clear-segment-cache.mjs');
  console.log('   Then regenerate the segment page in the preview.');
  process.exit(1);
}

console.log('\n✅ Segment page looks correct!');
console.log('   If user still sees issues, check:');
console.log('   1. Browser cache (hard refresh with Cmd+Shift+R)');
console.log('   2. Vercel deployment status');
console.log('   3. User viewing a different site/version');
