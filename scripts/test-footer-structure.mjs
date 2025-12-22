/**
 * Test script to check footer structure in generated segment pages
 */

const siteId = '9760191f-4968-4b5f-bdc7-97fc1e1b96df';
const segmentSlug = 'competitive-intelligence';

console.log('Testing segment page footer structure...\\n');
console.log(`Site ID: ${siteId}`);
console.log(`Segment: ${segmentSlug}\\n`);

try {
  const response = await fetch('http://localhost:1729/api/widget/generate-page', {
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

  const { html } = await response.json();

  // Extract footer section
  const footerMatch = html.match(/<footer[\s\S]*?<\/footer>/i);

  if (footerMatch) {
    const footerHTML = footerMatch[0];
    console.log('✅ FOOTER FOUND\\n');
    console.log('📦 Footer HTML length:', footerHTML.length, 'chars\\n');

    // Check for key elements
    const checks = {
      'CTA section': html.includes('Ready to Get Started'),
      'Dark footer (bg-gray-900)': footerHTML.includes('bg-gray-900'),
      'Responsive padding': footerHTML.includes('py-12 sm:py-16'),
      'Grid layout': footerHTML.includes('grid grid-cols'),
      'Logo with data-action': footerHTML.includes('data-action="back-to-landing"'),
      'Privacy links': footerHTML.includes('Privacy Policy'),
      'Feather icon script': footerHTML.includes('feather.replace'),
      'No Quick Links': !footerHTML.includes('Quick Links'),
    };

    console.log('🔍 Footer Structure Checks:\\n');
    for (const [check, passed] of Object.entries(checks)) {
      console.log(`  ${passed ? '✅' : '❌'} ${check}`);
    }

    // Save full footer HTML for inspection
    await import('fs').then(fs => {
      fs.writeFileSync('/tmp/footer-test.html', footerHTML);
      console.log('\\n💾 Footer HTML saved to /tmp/footer-test.html');
    });

    // Check for fake contact info patterns
    const fakePatterns = [
      'example@',
      'contact@company',
      '555-',
      '(555)',
      '123 Main Street',
      'info@example'
    ];

    let hasFakeData = false;
    for (const pattern of fakePatterns) {
      if (footerHTML.toLowerCase().includes(pattern.toLowerCase())) {
        console.log(`\\n⚠️  WARNING: Possible fake contact data found: "${pattern}"`);
        hasFakeData = true;
      }
    }

    if (!hasFakeData) {
      console.log('\\n✅ No fake contact data detected');
    }

    // Success summary
    const allPassed = Object.values(checks).every(v => v);
    if (allPassed && !hasFakeData) {
      console.log('\\n🎉 SUCCESS: Footer structure matches expected layout!');
      process.exit(0);
    } else {
      console.log('\\n⚠️  PARTIAL SUCCESS: Some checks failed');
      process.exit(1);
    }
  } else {
    console.log('❌ FOOTER NOT FOUND in generated HTML');
    process.exit(1);
  }

} catch (error) {
  console.error('❌ ERROR:', error.message);
  process.exit(1);
}
