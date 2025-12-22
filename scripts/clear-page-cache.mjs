/**
 * Clear page cache for a site to force fresh generation
 */

import { createClient } from '@supabase/supabase-js';

const SITE_ID = process.argv[2] || '9760191f-4968-4b5f-bdc7-97fc1e1b96df';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log(`🗑️  Clearing page cache for site: ${SITE_ID}`);
console.log('='.repeat(60));

try {
  const { data, error, count } = await supabase
    .from('site_pages')
    .delete({ count: 'exact' })
    .eq('site_id', SITE_ID);

  if (error) {
    console.error('❌ Error clearing cache:', error);
    process.exit(1);
  }

  console.log(`✅ Successfully cleared ${count || 0} cached pages`);
  console.log('\n📝 Pages will be regenerated on next request with latest prompts');
  console.log('   This ensures all data attributes are present for navigation\n');

} catch (err) {
  console.error('❌ Failed to clear cache:', err);
  process.exit(1);
}
