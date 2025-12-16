import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  const t20Id = '5c51ecfc-7792-4ad0-93f2-4106e60bee23';

  // Get an existing embedding to use as query
  const { data: existing } = await supabase
    .from('document_embeddings')
    .select('embedding, chunk_text')
    .eq('project_id', t20Id)
    .limit(1)
    .single();

  if (!existing?.embedding) {
    console.log('No embeddings found');
    return;
  }

  console.log('=== Using Real Embedding as Query ===');
  console.log('Source text:', existing.chunk_text.substring(0, 100) + '...');
  console.log('Embedding type:', typeof existing.embedding);
  console.log('Embedding preview:', existing.embedding.substring(0, 80) + '...');

  // Test 1: Use the embedding as-is (it's already a string from DB)
  console.log('\n=== Test 1: Using embedding string as-is ===');
  const { data: test1, error: err1 } = await supabase.rpc('match_documents', {
    query_embedding: existing.embedding,
    match_threshold: 0.1,  // Very low threshold
    match_count: 5,
    filter_project_id: t20Id,
    filter_chunk_types: null
  });

  if (err1) {
    console.log('Error:', err1.message);
    console.log('Details:', err1);
  } else {
    console.log('Results:', test1?.length || 0);
    test1?.forEach((r, i) => {
      console.log('Result ' + (i + 1) + ': similarity=' + r.similarity.toFixed(4) + ' | ' + r.chunk_text?.substring(0, 60));
    });
  }

  // Test 2: Try without project filter
  console.log('\n=== Test 2: Without project filter ===');
  const { data: test2, error: err2 } = await supabase.rpc('match_documents', {
    query_embedding: existing.embedding,
    match_threshold: 0.1,
    match_count: 5,
    filter_project_id: null,
    filter_chunk_types: null
  });

  if (err2) {
    console.log('Error:', err2.message);
  } else {
    console.log('Results:', test2?.length || 0);
    test2?.forEach((r, i) => {
      console.log('Result ' + (i + 1) + ': similarity=' + r.similarity.toFixed(4));
    });
  }

  // Test 3: Direct SQL to check if vector operations work
  console.log('\n=== Test 3: Direct query with fixed embedding ===');
  const { data: test3, error: err3 } = await supabase
    .from('document_embeddings')
    .select('id, chunk_text, embedding')
    .eq('project_id', t20Id)
    .limit(3);

  console.log('Direct query results:', test3?.length || 0);
  if (test3?.[0]?.embedding) {
    console.log('Embeddings have data: YES');
    // Check if embeddings are actually vectors or just strings
    const emb = test3[0].embedding;
    if (typeof emb === 'string' && emb.startsWith('[')) {
      console.log('Embedding appears to be vector string format');
      const parsed = JSON.parse(emb);
      console.log('Parsed length:', parsed.length);
    }
  }
}

check().catch(console.error);
