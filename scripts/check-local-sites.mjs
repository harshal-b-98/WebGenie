import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkSites() {
  const { data: sites, error: sitesError } = await supabase
    .from('sites')
    .select('id, title')
    .order('created_at', { ascending: false })
    .limit(5);

  if (sitesError) {
    console.error('Error fetching sites:', sitesError);
    return;
  }

  console.log('Sites in local instance:');
  for (const site of sites) {
    const { count } = await supabase
      .from('documents')
      .select('*', { count: 'exact', head: true })
      .eq('site_id', site.id);

    console.log(`  - ${site.title} (${site.id}): ${count || 0} documents`);
  }

  // Check content structure table
  const { data: structures } = await supabase
    .from('site_content_structure')
    .select('site_id, business_type, segments')
    .limit(5);

  console.log('\nContent structures saved:');
  if (structures && structures.length > 0) {
    structures.forEach(s => {
      const segmentCount = Array.isArray(s.segments) ? s.segments.length : 0;
      console.log(`  - ${s.site_id}: ${segmentCount} segments (${s.business_type})`);
    });
  } else {
    console.log('  (none)');
  }
}

checkSites().catch(console.error);
