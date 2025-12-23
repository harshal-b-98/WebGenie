/**
 * Test script to verify chat widget injection in segment pages
 */

const siteId = '9760191f-4968-4b5f-bdc7-97fc1e1b96df';
const segmentSlug = 'competitive-intelligence';

console.log('Testing segment page widget injection...\n');
console.log(`Site ID: ${siteId}`);
console.log(`Segment: ${segmentSlug}\n`);

try {
  const response = await fetch('http://localhost:1729/api/widget/generate-page-stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      siteId: siteId,
      pageType: 'segment',
      segment: segmentSlug
    })
  });

  if (!response.ok) {
    console.error(`HTTP error! status: ${response.status}`);
    process.exit(1);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  let completeHTML = '';
  let foundWidget = false;
  let foundDynamicNav = false;
  let currentEvent = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split('\n');

    for (const line of lines) {
      // Track current event type
      if (line.startsWith('event: ')) {
        currentEvent = line.slice(7).trim();
        if (currentEvent === 'complete') {
          console.log('✓ Generation completed\n');
        }
      }

      // Parse data lines
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6));

          // ONLY capture HTML from the complete event
          if (currentEvent === 'complete' && data.html) {
            completeHTML = data.html;
            console.log(`📦 Captured COMPLETE HTML (length: ${data.html.length} chars)`);
          } else if (data.html) {
            console.log(`📦 Section HTML (${currentEvent}): ${data.html.length} chars`);
          }
        } catch (e) {
          // Ignore JSON parse errors from partial chunks
        }
      }
    }
  }

  // Save HTML for inspection
  if (completeHTML) {
    await import('fs').then(fs => {
      fs.writeFileSync('/tmp/segment-page-test.html', completeHTML);
      console.log(`💾 HTML saved to /tmp/segment-page-test.html (${completeHTML.length} chars)\n`);
    });
  }

  // Check for chat widget injection (look for nextgenweb-chat classes)
  if (completeHTML.includes('nextgenweb-chat-') || completeHTML.includes('NEXTGENWEB_CONFIG')) {
    console.log('✅ CHAT WIDGET FOUND in generated HTML');
    foundWidget = true;
  } else {
    console.log('❌ CHAT WIDGET MISSING from generated HTML');
  }

  // Check for dynamic navigation injection
  if (completeHTML.includes('nav-controller.js')) {
    console.log('✅ DYNAMIC NAV FOUND in generated HTML');
    foundDynamicNav = true;
  } else {
    console.log('❌ DYNAMIC NAV MISSING from generated HTML');
  }

  // Check for chat widget config
  if (completeHTML.includes('window.WIDGET_CONFIG')) {
    console.log('✅ WIDGET CONFIG FOUND\n');
  } else {
    console.log('⚠️  WIDGET CONFIG MISSING\n');
  }

  // Success summary
  if (foundWidget && foundDynamicNav) {
    console.log('🎉 SUCCESS: All widget injections working correctly!');
    process.exit(0);
  } else {
    console.log('⚠️  PARTIAL SUCCESS: Some injections missing');
    process.exit(1);
  }

} catch (error) {
  console.error('❌ ERROR:', error.message);
  process.exit(1);
}
