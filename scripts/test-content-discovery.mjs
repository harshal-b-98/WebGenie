/**
 * Test script to trigger content discovery analysis
 * This will test if the metadata schema fix works correctly
 */

import { analyzeContentStructure, getContentStructure } from '../lib/services/content-discovery-service.ts';

const SITE_ID = process.argv[2];

if (!SITE_ID) {
  console.error('Usage: node scripts/test-content-discovery.mjs <site-id>');
  process.exit(1);
}

console.log(`🔍 Testing content discovery for site: ${SITE_ID}`);
console.log('='.repeat(60));

try {
  console.log('\n📊 Running content discovery analysis...');
  const structure = await analyzeContentStructure(SITE_ID, { force: true });

  console.log('\n✅ Content structure saved successfully!');
  console.log('\nStructure Details:');
  console.log(`  Business Type: ${structure.businessType}`);
  console.log(`  Segments Count: ${structure.segments.length}`);
  console.log(`  Max Depth: ${structure.maxDepth}`);
  console.log(`  Analysis Confidence: ${structure.analysisConfidence}`);
  console.log(`  Primary CTA: ${structure.primaryCTA.text} (${structure.primaryCTA.action})`);

  if (structure.segments.length > 0) {
    console.log('\n📋 Discovered Segments:');
    structure.segments.forEach((seg, idx) => {
      console.log(`  ${idx + 1}. ${seg.name} (${seg.slug})`);
      console.log(`     Description: ${seg.description}`);
      console.log(`     Items: ${seg.items?.length || 0}`);
      if (seg.items && seg.items.length > 0) {
        seg.items.forEach((item, itemIdx) => {
          console.log(`       ${itemIdx + 1}. ${item.name} (${item.slug})`);
        });
      }
    });
  }

  console.log('\n🔄 Retrieving saved structure from database...');
  const retrieved = await getContentStructure(SITE_ID);

  if (retrieved) {
    console.log('✅ Structure retrieved successfully from database');
    console.log(`  Retrieved ${retrieved.segments.length} segments`);

    // Check for generic names
    const hasGenericNames = retrieved.segments.some(s =>
      s.name.toLowerCase().includes('related topic') ||
      s.slug.includes('solution1') ||
      s.name.match(/^(solution|topic|item)\s*\d+$/i)
    );

    if (hasGenericNames) {
      console.log('⚠️  WARNING: Generic names detected in segments!');
    } else {
      console.log('✅ No generic placeholder names detected');
    }
  } else {
    console.log('❌ Failed to retrieve structure from database');
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ Test completed successfully');

} catch (error) {
  console.error('\n❌ Content discovery failed:', error);
  console.error('Error details:', {
    message: error.message,
    code: error.code,
    details: error.details,
  });
  process.exit(1);
}
