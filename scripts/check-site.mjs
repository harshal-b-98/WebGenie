import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  // Check ALL documents in database
  const { data: allDocs, count: totalDocs } = await supabase
    .from('documents')
    .select('id, site_id, filename, status', { count: 'exact' })
    .limit(20);

  console.log('=== ALL DOCUMENTS IN DATABASE ===');
  console.log('Total documents:', totalDocs);
  allDocs?.forEach(d => console.log('  -', d.filename, '| site:', d.site_id, '| status:', d.status));

  // Check ALL embeddings
  const { count: totalEmbeddings } = await supabase
    .from('document_embeddings')
    .select('id', { count: 'exact', head: true });

  console.log('\n=== EMBEDDINGS ===');
  console.log('Total embeddings:', totalEmbeddings);

  // Check sites
  const { data: sites } = await supabase
    .from('sites')
    .select('id, title')
    .order('created_at', { ascending: false })
    .limit(5);

  console.log('\n=== RECENT SITES ===');
  sites?.forEach(s => console.log('  -', s.title, '| id:', s.id));

  // Check T20 specifically
  const t20Id = '5c51ecfc-7792-4ad0-93f2-4106e60bee23';
  const { data: t20Docs } = await supabase
    .from('documents')
    .select('id, filename, processing_status')
    .eq('site_id', t20Id);

  console.log('\n=== T20 DOCUMENTS ===');
  console.log('Count:', t20Docs?.length || 0);
  t20Docs?.forEach(d => console.log('  -', d.filename, '| status:', d.processing_status));

  // Check T20 embeddings (column is project_id not site_id)
  const { data: t20Embeddings, count: t20EmbeddingCount } = await supabase
    .from('document_embeddings')
    .select('id, document_id, chunk_index', { count: 'exact' })
    .eq('project_id', t20Id)
    .limit(5);

  console.log('\n=== T20 EMBEDDINGS ===');
  console.log('Count:', t20EmbeddingCount);
  t20Embeddings?.forEach(e => console.log('  - doc:', e.document_id, '| chunk:', e.chunk_index));

  // Get sample embeddings to see structure
  const { data: sampleEmbeddings, error: embError } = await supabase
    .from('document_embeddings')
    .select('*')
    .limit(2);

  console.log('\n=== SAMPLE EMBEDDINGS ===');
  if (embError) {
    console.log('Error:', embError.message);
  } else {
    console.log('Count:', sampleEmbeddings?.length);
    sampleEmbeddings?.forEach(e => {
      const { embedding, ...rest } = e;
      console.log('  -', rest);
    });
  }
}

check().catch(console.error);
