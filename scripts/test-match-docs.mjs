import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  const t20Id = '5c51ecfc-7792-4ad0-93f2-4106e60bee23';

  // Check the embeddings directly
  const { data: embeddings, error: embError } = await supabase
    .from('document_embeddings')
    .select('id, project_id, document_id, chunk_text, chunk_index')
    .eq('project_id', t20Id)
    .limit(3);

  console.log('=== T20 Embeddings Sample ===');
  if (embError) {
    console.log('Error:', embError.message);
  } else {
    console.log('Found:', embeddings?.length, 'embeddings');
    embeddings?.forEach((e, i) => {
      console.log('\nEmbedding ' + (i + 1) + ':');
      console.log('  ID:', e.id);
      console.log('  project_id:', e.project_id);
      console.log('  document_id:', e.document_id);
      console.log('  chunk_index:', e.chunk_index);
      console.log('  text preview:', e.chunk_text?.substring(0, 100) + '...');
    });
  }

  // Try calling match_documents to see if it exists and what error we get
  console.log('\n=== Testing match_documents RPC ===');

  // Create a dummy embedding (1536 dimensions for ada-002)
  const dummyEmbedding = new Array(1536).fill(0.01);

  const { data: rpcData, error: rpcError } = await supabase.rpc('match_documents', {
    query_embedding: JSON.stringify(dummyEmbedding),
    match_threshold: 0.1,
    match_count: 5,
    filter_project_id: t20Id,
    filter_chunk_types: null
  });

  if (rpcError) {
    console.log('RPC Error:', rpcError.message);
    console.log('Error code:', rpcError.code);
    console.log('Error details:', rpcError.details);
    console.log('Full error:', JSON.stringify(rpcError, null, 2));
  } else {
    console.log('RPC Results:', rpcData?.length || 0, 'found');
    rpcData?.forEach((r, i) => {
      console.log('Result ' + (i + 1) + ':', r.similarity, '-', r.chunk_text?.substring(0, 50));
    });
  }
}

check().catch(console.error);
