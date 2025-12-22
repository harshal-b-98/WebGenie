/**
 * Trigger content discovery analysis for a site
 */

import { analyzeContentStructure, clearContentStructure } from '../lib/services/content-discovery-service.ts';

const SITE_ID = process.argv[2];
const FORCE = process.argv[3] === '--force';

if (!SITE_ID) {
  console.error('Usage: node scripts/trigger-content-discovery.mjs <site-id> [--force]');
  process.exit(1);
}

console.log(`🔍 Triggering content discovery for site: ${SITE_ID}`);
console.log(`   Force mode: ${FORCE}`);
console.log('='.repeat(60));

try {
  if (FORCE) {
    console.log('\n🗑️  Clearing existing content structure...');
    await clearContentStructure(SITE_ID);
    console.log('✅ Content structure cleared');
  }

  console.log('\n📊 Running content discovery analysis...');
  const structure = await analyzeContentStructure(SITE_ID, { force: true });

  console.log('\n✅ Content structure saved!');
  console.log('\nStructure Details:');
  console.log(`  Business Type: ${structure.businessType}`);
  console.log(`  Segments: ${structure.segments.length}`);
  console.log(`  Max Depth: ${structure.maxDepth}`);
  console.log(`  Confidence: ${structure.analysisConfidence}`);
  console.log(`  Document Hash: ${structure.documentHash.substring(0, 8)}...`);
  console.log(`  Last Analyzed: ${structure.lastAnalyzedAt}`);
  console.log(`  Primary CTA: ${structure.primaryCTA.text}`);

  if (structure.segments.length > 0) {
    console.log('\n📋 Segments:');
    structure.segments.forEach((seg, idx) => {
      console.log(`  ${idx + 1}. ${seg.name} (${seg.slug})`);
    });
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ Test completed - metadata should now be saved!');

} catch (error) {
  console.error('\n❌ Content discovery failed:', error);
  process.exit(1);
}
