import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'http://127.0.0.1:54331',
  'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz'
);

const siteId = process.argv[2] || '17840c9b-1d60-4277-9ae7-caff9e96e845';

const { data: site } = await supabase
  .from('sites')
  .select('current_version_id, title')
  .eq('id', siteId)
  .single();

if (!site) {
  console.log('Site not found');
  process.exit(1);
}

console.log('Site:', site.title);

if (!site.current_version_id) {
  console.log('No version generated yet');
  process.exit(1);
}

const { data: version } = await supabase
  .from('site_versions')
  .select('html_content')
  .eq('id', site.current_version_id)
  .single();

if (!version) {
  console.log('Version not in DB');
  process.exit(1);
}

const html = version.html_content;

// Find navbar
const headerStart = html.indexOf('<header');
const headerEnd = html.indexOf('</header>') + 9;

console.log('\n╔════════════════════════════════════════════════════════╗');
console.log('║       ACTUAL NAVBAR HTML (from AI generation)         ║');
console.log('╚════════════════════════════════════════════════════════╝\n');
console.log(html.substring(headerStart, Math.min(headerEnd, headerStart + 800)));

console.log('\n╔════════════════════════════════════════════════════════╗');
console.log('║            PROBLEM DIAGNOSIS                           ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

// Check for proper structure
const checks = [
  ['flex-shrink-0 (prevents logo shrink)', html.includes('flex-shrink-0')],
  ['justify-between (distributes space)', html.includes('justify-between')],
  ['Three separate containers', (html.match(/<nav class="hidden md:flex/g) || []).length >= 1],
];

checks.forEach(([name, pass]) => {
  console.log(pass ? '✅' : '❌', name);
});

console.log('\n════════════════════════════════════════════════════════\n');
