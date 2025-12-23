/**
 * Test Landing Page Generation with Streaming Fix
 * Verifies that the controller error fix is working
 */

const siteId = '9760191f-4968-4b5f-bdc7-97fc1e1b96df';

console.log('🧪 Testing Landing Page Generation\n');
console.log(`Site ID: ${siteId}\n`);

console.log('Calling /api/ai/generate-stream...\n');

try {
  const response = await fetch('http://localhost:1729/api/ai/generate-stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      siteId: siteId,
      conversationId: null
    })
  });

  if (!response.ok) {
    console.error(`❌ HTTP error! status: ${response.status}`);
    const text = await response.text();
    console.error('Response:', text);
    process.exit(1);
  }

  console.log('✅ Response received, streaming events...\n');

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let eventCount = 0;
  let hasError = false;
  let completionData = null;

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      console.log('\n✅ Stream closed gracefully');
      break;
    }

    const chunk = decoder.decode(value);
    const lines = chunk.split('\n');

    for (const line of lines) {
      if (line.startsWith('event: ')) {
        const eventType = line.substring(7);
        eventCount++;
        console.log(`📨 Event ${eventCount}: ${eventType}`);
      } else if (line.startsWith('data: ')) {
        const data = JSON.parse(line.substring(6));

        if (data.message) {
          console.log(`   Message: ${data.message}`);
        }
        if (data.progress !== undefined) {
          console.log(`   Progress: ${data.progress}%`);
        }
        if (data.partial) {
          console.log(`   Partial HTML: ${data.length} chars`);
        }
        if (data.success !== undefined) {
          completionData = data;
          console.log(`\n✅ Generation complete!`);
          console.log(`   Version ID: ${data.versionId}`);
          console.log(`   HTML Length: ${data.htmlLength} chars`);
          console.log(`   Generation Time: ${data.generationTime}ms`);
        }
        if (data.message && line.includes('error')) {
          hasError = true;
          console.log(`\n❌ Error: ${data.message}`);
        }
      }
    }
  }

  if (hasError) {
    console.log('\n❌ TEST FAILED: Stream contained error events');
    process.exit(1);
  }

  if (!completionData) {
    console.log('\n❌ TEST FAILED: No completion event received');
    process.exit(1);
  }

  if (completionData.htmlLength < 1000) {
    console.log('\n❌ TEST FAILED: HTML too short (likely empty content)');
    process.exit(1);
  }

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('🎉 TEST PASSED!');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('✅ No controller errors');
  console.log('✅ Stream completed successfully');
  console.log('✅ HTML content generated');
  console.log(`✅ Total events: ${eventCount}`);
  console.log('═══════════════════════════════════════════════════════════\n');

  process.exit(0);

} catch (error) {
  console.error('❌ ERROR:', error.message);
  process.exit(1);
}
