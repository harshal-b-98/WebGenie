/**
 * Test script to verify chat widget injection fix
 * Tests that widget appears on both cached and newly generated pages
 */

const siteId = '9760191f-4968-4b5f-bdc7-97fc1e1b96df';
const testSegment = 'competitive-intelligence';

console.log('🧪 Testing Chat Widget Injection Fix\n');
console.log(`Site ID: ${siteId}`);
console.log(`Test Segment: ${testSegment}\n`);

// Test 1: New Page Generation
console.log('Test 1: NEW PAGE GENERATION');
console.log('Generating fresh page (not cached)...\n');

try {
  const response1 = await fetch('http://localhost:1729/api/widget/generate-page', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      siteId: siteId,
      pageType: 'segment',
      segment: testSegment
    })
  });

  if (!response1.ok) {
    console.error(`❌ HTTP error! status: ${response1.status}`);
    process.exit(1);
  }

  const data1 = await response1.json();
  const html1 = data1.html;

  console.log(`✅ Response received`);
  console.log(`   Cached: ${data1.cached}`);
  console.log(`   HTML length: ${html1.length} chars`);

  // Check for widget markers
  const hasWidgetConfig = html1.includes('NEXTGENWEB_CONFIG');
  const hasWidgetClass = html1.includes('nextgenweb-chat-');
  const hasWidgetScript = html1.includes('<script>') && html1.includes('NEXTGENWEB_CONFIG');

  console.log(`   Widget config present: ${hasWidgetConfig ? '✅' : '❌'}`);
  console.log(`   Widget classes present: ${hasWidgetClass ? '✅' : '❌'}`);
  console.log(`   Widget script present: ${hasWidgetScript ? '✅' : '❌'}`);

  if (!hasWidgetConfig || !hasWidgetClass) {
    console.log('\n❌ TEST 1 FAILED: Widget missing from new page!\n');
    process.exit(1);
  }

  console.log('\n✅ TEST 1 PASSED: Widget present on new page\n');

  // Wait a moment for cache to settle
  console.log('Waiting 2 seconds for cache...\n');
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Test 2: Cached Page
  console.log('Test 2: CACHED PAGE RETRIEVAL');
  console.log('Fetching same page (should be cached)...\n');

  const response2 = await fetch('http://localhost:1729/api/widget/generate-page', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      siteId: siteId,
      pageType: 'segment',
      segment: testSegment
    })
  });

  if (!response2.ok) {
    console.error(`❌ HTTP error! status: ${response2.status}`);
    process.exit(1);
  }

  const data2 = await response2.json();
  const html2 = data2.html;

  console.log(`✅ Response received`);
  console.log(`   Cached: ${data2.cached}`);
  console.log(`   HTML length: ${html2.length} chars`);

  // Check for widget markers
  const hasWidgetConfig2 = html2.includes('NEXTGENWEB_CONFIG');
  const hasWidgetClass2 = html2.includes('nextgenweb-chat-');
  const hasWidgetScript2 = html2.includes('<script>') && html2.includes('NEXTGENWEB_CONFIG');

  console.log(`   Widget config present: ${hasWidgetConfig2 ? '✅' : '❌'}`);
  console.log(`   Widget classes present: ${hasWidgetClass2 ? '✅' : '❌'}`);
  console.log(`   Widget script present: ${hasWidgetScript2 ? '✅' : '❌'}`);

  if (!hasWidgetConfig2 || !hasWidgetClass2) {
    console.log('\n❌ TEST 2 FAILED: Widget missing from cached page!\n');
    console.log('This is the PRIMARY BUG we are fixing!');
    process.exit(1);
  }

  console.log('\n✅ TEST 2 PASSED: Widget present on cached page\n');

  // Test 3: Verify No Duplicate Widgets
  console.log('Test 3: NO DUPLICATE WIDGETS');

  // Check for duplicate widget INITIALIZATION (not just string occurrences)
  const widgetInitCount = (html2.match(/window\.NEXTGENWEB_CONFIG\s*=/g) || []).length;
  const widgetBubbleCount = (html2.match(/id="nextgenweb-chat-bubble"/g) || []).length;
  const widgetContainerCount = (html2.match(/class="nextgenweb-chat-container"/g) || []).length;

  console.log(`   Widget initializations: ${widgetInitCount}`);
  console.log(`   Widget bubbles (by ID): ${widgetBubbleCount}`);
  console.log(`   Widget containers: ${widgetContainerCount}`);

  if (widgetInitCount > 1 || widgetBubbleCount > 1 || widgetContainerCount > 1) {
    console.log('\n❌ TEST 3 FAILED: Duplicate widgets detected!\n');
    console.log('Multiple widget initializations found - widget may be injected twice');
    process.exit(1);
  }

  console.log('\n✅ TEST 3 PASSED: No duplicate widgets\n');

  // Test 4: Rapid Navigation
  console.log('Test 4: RAPID NAVIGATION (3 different segments)');

  const segments = ['competitive-intelligence', 'features', 'solutions'];
  let allPassed = true;

  for (const segment of segments) {
    const response = await fetch('http://localhost:1729/api/widget/generate-page', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        siteId: siteId,
        pageType: 'segment',
        segment: segment
      })
    });

    const data = await response.json();
    const hasWidget = data.html.includes('NEXTGENWEB_CONFIG');

    console.log(`   ${segment}: ${hasWidget ? '✅' : '❌'} (cached: ${data.cached})`);

    if (!hasWidget) {
      allPassed = false;
    }
  }

  if (!allPassed) {
    console.log('\n❌ TEST 4 FAILED: Widget missing on some pages during rapid navigation!\n');
    process.exit(1);
  }

  console.log('\n✅ TEST 4 PASSED: Widget persists across all pages\n');

  // SUCCESS SUMMARY
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🎉 ALL TESTS PASSED!');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('✅ Widget appears on new pages');
  console.log('✅ Widget appears on cached pages (PRIMARY FIX)');
  console.log('✅ No duplicate widgets');
  console.log('✅ Widget persists across rapid navigation');
  console.log('═══════════════════════════════════════════════════════════\n');

  process.exit(0);

} catch (error) {
  console.error('❌ ERROR:', error.message);
  process.exit(1);
}
