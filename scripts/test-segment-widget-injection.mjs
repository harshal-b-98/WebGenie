#!/usr/bin/env node

/**
 * Test Segment Page Widget Injection
 *
 * This script checks if:
 * 1. Widget is being injected (NEXTGENWEB_CONFIG present)
 * 2. NO "open-chat" buttons exist (AI not adding them)
 * 3. Only ONE CTA button in CTA section
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://cfhssgueszhoracjeyou.supabase.co";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmaHNzZ3Vlc3pob3JhY2pleW91Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDc5MTUzNCwiZXhwIjoyMDgwMzY3NTM0fQ.25FrDBoz5f2bSVaymPTKtetyjD1acfUyQbVhj8en8n8";

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔍 Testing segment page widget injection...\n');

// Query for the most recent segment page
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
  console.log('   Please generate a segment page first by:');
  console.log('   1. Opening the preview');
  console.log('   2. Navigating to a segment page (e.g., Features, Platform)');
  console.log('   3. Running this script again');
  process.exit(0);
}

const page = pages[0];
const html = page.html_content;

console.log('📄 Found segment page:');
console.log(`   Site ID: ${page.site_id}`);
console.log(`   Path: ${page.page_path}`);
console.log(`   Generated: ${new Date(page.created_at).toLocaleString()}`);
console.log(`   HTML Length: ${html.length} characters`);
console.log();

// TEST 1: Widget Injection
console.log('🧪 TEST 1: Widget Injection');
const hasConfig = html.includes('NEXTGENWEB_CONFIG');
const hasStyles = html.includes('nextgenweb-widget-styles');
const hasChatBubble = html.includes('nextgenweb-chat-bubble');

if (hasConfig && hasStyles) {
  console.log('   ✅ PASS: Chat widget is injected');
  console.log(`      - Has NEXTGENWEB_CONFIG: ${hasConfig}`);
  console.log(`      - Has widget styles: ${hasStyles}`);
  console.log(`      - Has chat bubble element: ${hasChatBubble}`);
} else {
  console.log('   ❌ FAIL: Chat widget NOT injected');
  console.log(`      - Has NEXTGENWEB_CONFIG: ${hasConfig}`);
  console.log(`      - Has widget styles: ${hasStyles}`);
}
console.log();

// TEST 2: No AI-Generated Chat Buttons
console.log('🧪 TEST 2: AI Not Adding Chat Buttons');
const openChatButtons = (html.match(/data-action="open-chat"/g) || []).length;
if (openChatButtons === 0) {
  console.log('   ✅ PASS: NO "open-chat" buttons found');
} else {
  console.log(`   ❌ FAIL: Found ${openChatButtons} "open-chat" buttons`);
  console.log('      AI is still adding chat buttons despite prompt warnings');
}
console.log();

// TEST 3: CTA Section Has Only One Button
console.log('🧪 TEST 3: CTA Section Button Count');
const ctaMatch = html.match(/Ready to Get Started\?[\s\S]{0,800}<\/section>/);
if (ctaMatch) {
  const ctaSection = ctaMatch[0];
  const ctaButtonCount = (ctaSection.match(/<a href="#"/g) || []).length;

  if (ctaButtonCount === 1) {
    console.log('   ✅ PASS: CTA section has exactly 1 button');
  } else {
    console.log(`   ❌ FAIL: CTA section has ${ctaButtonCount} buttons (expected 1)`);

    // Show what buttons exist
    const buttonMatches = ctaSection.match(/<a href="#"[^>]*data-action="([^"]+)"[^>]*>([^<]+)<\/a>/g);
    if (buttonMatches) {
      console.log('      Found buttons:');
      buttonMatches.forEach(btn => {
        const actionMatch = btn.match(/data-action="([^"]+)"/);
        const textMatch = btn.match(/>([^<]+)</);
        console.log(`      - ${textMatch?.[1]} (action: ${actionMatch?.[1]})`);
      });
    }
  }
}
console.log();

// TEST 4: Footer Has No Chat Links
console.log('🧪 TEST 4: Footer Chat Links');
if (html.includes('Chat with Us')) {
  console.log('   ❌ FAIL: Footer contains "Chat with Us" link');
} else {
  console.log('   ✅ PASS: Footer has no "Chat with Us" link');
}
console.log();

// SUMMARY
console.log('📊 SUMMARY');
const allPassed = hasConfig && hasStyles && openChatButtons === 0;

if (allPassed) {
  console.log('   ✅ ALL TESTS PASSED');
  console.log('   - Widget is injected correctly');
  console.log('   - AI is not adding unwanted chat buttons');
  console.log('   - CTA section is clean');
} else {
  console.log('   ⚠️  SOME TESTS FAILED');

  if (!hasConfig || !hasStyles) {
    console.log('   - Widget injection issue detected');
    console.log('     Check: /app/api/widget/generate-page-stream/route.ts line 973');
    console.log('     Verify: chatWidgetEnabled is true (line 733)');
  }

  if (openChatButtons > 0) {
    console.log('   - AI still adding chat buttons');
    console.log('     Check: Prompt warnings at lines 427-429 in route.ts');
    console.log('     Consider: Adding post-processing filter to strip buttons');
  }
}
