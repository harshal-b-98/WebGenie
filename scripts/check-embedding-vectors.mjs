import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  const t20Id = '5c51ecfc-7792-4ad0-93f2-4106e60bee23';

  // Check if embeddings have actual vector data
  const { data: embeddings, error } = await supabase
    .from('document_embeddings')
    .select('id, chunk_index, embedding')
    .eq('project_id', t20Id)
    .limit(3);

  console.log('=== Checking Embedding Vectors ===');
  if (error) {
    console.log('Error:', error.message);
    return;
  }

  console.log('Found:', embeddings?.length, 'embeddings\n');
  embeddings?.forEach((e, i) => {
    console.log('Embedding ' + (i + 1) + ' (chunk ' + e.chunk_index + '):');
    if (e.embedding) {
      console.log('  Has embedding: YES');
      console.log('  Type:', typeof e.embedding);
      console.log('  Is array:', Array.isArray(e.embedding));
      if (Array.isArray(e.embedding)) {
        console.log('  Length:', e.embedding.length);
        console.log('  First 5 values:', e.embedding.slice(0, 5));
      } else if (typeof e.embedding === 'string') {
        console.log('  String length:', e.embedding.length);
        console.log('  Preview:', e.embedding.substring(0, 100));
      }
    } else {
      console.log('  Has embedding: NO (NULL)');
    }
    console.log('');
  });
}

check().catch(console.error);
