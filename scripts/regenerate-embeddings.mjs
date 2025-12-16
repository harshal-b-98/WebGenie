/**
 * Script to regenerate embeddings for T20 documents
 * Run with: node scripts/regenerate-embeddings.mjs
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const T20_SITE_ID = '5c51ecfc-7792-4ad0-93f2-4106e60bee23';

async function regenerateEmbeddings() {
  console.log('=== Regenerating Embeddings for T20 ===\n');

  // Get T20 documents
  const { data: docs, error } = await supabase
    .from('documents')
    .select('id, filename, extracted_text')
    .eq('site_id', T20_SITE_ID);

  if (error) {
    console.error('Error fetching documents:', error);
    return;
  }

  console.log('Found', docs.length, 'documents\n');

  for (const doc of docs) {
    console.log('Processing:', doc.filename);
    console.log('  Document ID:', doc.id);
    console.log('  Text length:', doc.extracted_text?.length || 0, 'chars');

    // Call the reprocess document API
    const response = await fetch(`http://localhost:1729/api/documents/${doc.id}/reprocess`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (response.ok) {
      const result = await response.json();
      console.log('  Result:', result);
    } else {
      console.log('  Error:', response.status, await response.text());
    }
    console.log('');
  }

  // Verify embeddings
  const { count: newCount } = await supabase
    .from('document_embeddings')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', T20_SITE_ID);

  console.log('\n=== After Processing ===');
  console.log('T20 embeddings count:', newCount);
}

regenerateEmbeddings().catch(console.error);
