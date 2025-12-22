import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const siteId = '9760191f-4968-4b5f-bdc7-97fc1e1b96df';

const { data, error } = await supabase
  .from('sites')
  .select('id, title, chat_widget_enabled, dynamic_pages_enabled')
  .eq('id', siteId)
  .single();

if (error) {
  console.error('Error:', error);
  process.exit(1);
}

console.log('Site Settings:');
console.log('  Title:', data.title);
console.log('  Chat Widget Enabled:', data.chat_widget_enabled);
console.log('  Dynamic Pages Enabled:', data.dynamic_pages_enabled);
console.log('\nExpected behavior:');
console.log('  - null or undefined → defaults to true');
console.log('  - false → widget disabled');
console.log('  - true → widget enabled');
