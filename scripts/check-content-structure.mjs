import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkContentStructure() {
  // Get all content structures
  const { data, error } = await supabase
    .from('site_content_structure')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Found ${data.length} content structures\n`);

  for (const structure of data) {
    console.log('='.repeat(60));
    console.log(`Site ID: ${structure.site_id}`);
    console.log(`Business Type: ${structure.business_type}`);

    const segments = structure.segments || [];
    console.log(`Segments: ${segments.length}`);

    // Check for generic names
    const hasGeneric = segments.some(s =>
      s.name?.toLowerCase().includes('related topic') ||
      s.slug?.includes('solution1') ||
      /^(solution|topic|item|segment)\s*\d+$/i.test(s.name || '') ||
      /^(solution|topic|item|segment)[-_]?\d+$/i.test(s.slug || '')
    );

    if (hasGeneric) {
      console.log('⚠️  HAS GENERIC NAMES:');
    } else {
      console.log('✅ Real segment names:');
    }

    segments.forEach((seg, idx) => {
      console.log(`  ${idx + 1}. ${seg.name} (${seg.slug})`);
      if (seg.items && seg.items.length > 0) {
        seg.items.forEach((item, itemIdx) => {
          console.log(`     ${itemIdx + 1}. ${item.name} (${item.slug})`);
        });
      }
    });

    console.log(`\nMetadata:`, JSON.stringify(structure.metadata, null, 2));
    console.log();
  }
}

checkContentStructure().catch(console.error);
