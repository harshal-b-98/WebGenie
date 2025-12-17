import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'http://127.0.0.1:54331',
  'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz'
);

const siteId = process.argv[2] || '167f37cf-7003-4c94-a4de-45e7a3f6a309';

const { data: pages } = await supabase
  .from('dynamic_pages')
  .select('id, page_slug, html_content, created_at')
  .eq('site_id', siteId)
  .order('created_at', { ascending: false })
  .limit(1);

if (!pages || pages.length === 0) {
  console.log('No dynamic pages found');
  process.exit(1);
}

const page = pages[0];
console.log('Dynamic Page:', page.page_slug);
console.log('Created:', page.created_at);

const html = page.html_content;

// Find navbar
const headerStart = html.indexOf('<header');
const headerEnd = html.indexOf('</header>') + 9;

console.log('\n╔═══════════════════════════════════════════════════════╗');
console.log('║   DYNAMIC PAGE NAVBAR (after clicking card)          ║');
console.log('╚═══════════════════════════════════════════════════════╝\n');
console.log(html.substring(headerStart, Math.min(headerEnd, headerStart + 900)));

console.log('\n╔═══════════════════════════════════════════════════════╗');
console.log('║           ADAPTIVE NAVBAR CHECKS                      ║');
console.log('╚═══════════════════════════════════════════════════════╝\n');

const checks = [
  ['ml-8 (nav left margin)', html.includes('ml-8')],
  ['ml-auto (CTA right push)', html.includes('ml-auto')],
  ['flex-1 (adaptive nav)', html.includes('flex-1')],
  ['max-w-[180px] (logo constraint)', html.includes('max-w-[180px]') || html.includes('max-w-[200px]')],
  ['gap-4 (auto spacing)', html.includes('gap-4')],
];

checks.forEach(([name, pass]) => {
  console.log(pass ? '✅' : '❌', name);
});

console.log('\n═══════════════════════════════════════════════════════\n');
