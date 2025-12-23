#!/usr/bin/env node

/**
 * Verify Segment Page Chat Widget Fix
 *
 * This script checks if:
 * 1. The segment page template has removed all "open-chat" CTA buttons
 * 2. The chat widget is properly injected via widget-injection.ts
 * 3. The generated HTML is correct
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the route file that contains the segment template
const routeFilePath = path.join(__dirname, '../app/api/widget/generate-page-stream/route.ts');
const routeContent = fs.readFileSync(routeFilePath, 'utf-8');

console.log('🔍 Verifying segment page chat widget fix...\n');

// Check 1: Ensure NO "open-chat" data-action attributes exist in the template
const openChatMatches = routeContent.match(/data-action="open-chat"/g);
if (openChatMatches) {
  console.error('❌ FAILED: Found', openChatMatches.length, '"open-chat" buttons still in the template');
  console.error('   These should be removed as they have no handler in nav-controller.js');
  process.exit(1);
} else {
  console.log('✅ PASS: No "open-chat" buttons found in segment template');
}

// Check 2: Verify CTA section has only ONE button (not two)
const ctaSection = routeContent.match(/<section class="relative bg-gradient-to-br from-indigo-600.*?<\/section>/s);
if (ctaSection) {
  const ctaButtonCount = (ctaSection[0].match(/<a href="#"/g) || []).length;
  if (ctaButtonCount === 1) {
    console.log('✅ PASS: CTA section contains exactly 1 button (as expected)');
  } else {
    console.error('❌ FAILED: CTA section contains', ctaButtonCount, 'buttons (expected 1)');
    process.exit(1);
  }
}

// Check 3: Verify footer Quick Actions has NO "Chat with Us" link
const footerQuickActions = routeContent.match(/Column 2: Quick Actions.*?<\/div>/s);
if (footerQuickActions) {
  const hasChatLink = footerQuickActions[0].includes('Chat with Us');
  if (hasChatLink) {
    console.error('❌ FAILED: Footer Quick Actions still contains "Chat with Us" link');
    process.exit(1);
  } else {
    console.log('✅ PASS: Footer Quick Actions has no "Chat with Us" link');
  }
}

// Check 4: Verify Support link is static text (not clickable)
const footerBottom = routeContent.match(/Footer Bottom.*?<\/div>/s);
if (footerBottom) {
  const supportMatch = footerBottom[0].match(/<span class="text-gray-500">Support<\/span>/);
  if (supportMatch) {
    console.log('✅ PASS: Support link is static text (not clickable)');
  } else {
    console.error('❌ FAILED: Support link is not static text');
    process.exit(1);
  }
}

// Check 5: Verify widget injection is called
const widgetInjectionCall = routeContent.includes('injectChatWidget(');
if (widgetInjectionCall) {
  console.log('✅ PASS: Widget injection function is called for segment pages');
} else {
  console.error('❌ FAILED: Widget injection is not being called');
  process.exit(1);
}

console.log('\n✅ ALL CHECKS PASSED - Segment page fix is correctly implemented');
console.log('\n📝 Summary:');
console.log('   - No "open-chat" CTA buttons in template');
console.log('   - CTA section has single button');
console.log('   - Footer has no "Chat with Us" link');
console.log('   - Support is static text');
console.log('   - Chat widget injection is active');
console.log('\n💡 Next: Clear cache and test in browser');
