/**
 * List all cached pages to see what's in the database
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('📋 Listing all cached pages...');
console.log('='.repeat(60));

try {
  const { data, error, count } = await supabase
    .from('site_pages')
    .select('site_id, page_slug, page_type, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('❌ Error fetching cached pages:', error);
    process.exit(1);
  }

  console.log(`Total cached pages: ${count || 0}\n`);

  if (data && data.length > 0) {
    data.forEach((page, idx) => {
      console.log(`${idx + 1}. Site: ${page.site_id.substring(0, 8)}... | ${page.page_type} | ${page.page_slug}`);
    });
  } else {
    console.log('No cached pages found');
  }

} catch (err) {
  console.error('❌ Failed to list cached pages:', err);
  process.exit(1);
}
