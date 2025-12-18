/**
 * Script to generate embeddings for ALL documents across all sites
 * Run with: node scripts/generate-all-embeddings.mjs
 */
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { config } from 'dotenv';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const CHUNK_SIZE_MIN = 500;
const CHUNK_SIZE_MAX = 1000;

function splitIntoSentences(text) {
  return text
    .replace(/([.!?])\s+([A-Z])/g, "$1|$2")
    .split("|")
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

function classifyChunkType(text) {
  const lowerText = text.toLowerCase();

  if (/\$[\d,]+|pricing|plans?|cost|subscription/i.test(lowerText)) return 'pricing';
  if (/features?|capabilities|functionality/i.test(lowerText)) return 'feature';
  if (/benefits?|advantages?|helps?|improves?/i.test(lowerText)) return 'benefit';
  if (/use case|example|scenario|how to/i.test(lowerText)) return 'use_case';
  if (/API|SDK|integration|technical|implementation/i.test(lowerText)) return 'technical';
  if (/testimonial|review|customer said/i.test(lowerText)) return 'testimonial';

  return 'general';
}

function extractKeywords(text) {
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of',
    'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been', 'be', 'have',
    'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may',
    'might', 'can', 'this', 'that', 'these', 'those', 'it', 'its', 'them', 'their'
  ]);

  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3 && !stopWords.has(word));

  const wordCounts = new Map();
  words.forEach(word => {
    wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
  });

  return Array.from(wordCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);
}

function chunkDocument(text) {
  const chunks = [];
  const sentences = splitIntoSentences(text);

  let currentChunk = '';
  let chunkIndex = 0;

  for (const sentence of sentences) {
    const potentialChunk = currentChunk + (currentChunk ? ' ' : '') + sentence;

    if (potentialChunk.length > CHUNK_SIZE_MAX && currentChunk.length >= CHUNK_SIZE_MIN) {
      chunks.push({
        text: currentChunk,
        index: chunkIndex,
        type: classifyChunkType(currentChunk),
        keywords: extractKeywords(currentChunk),
      });
      chunkIndex++;

      const lastSentences = currentChunk.split(/[.!?]+/).slice(-2).join('. ');
      currentChunk = lastSentences + ' ' + sentence;
    } else {
      currentChunk = potentialChunk;
    }
  }

  if (currentChunk.trim().length >= CHUNK_SIZE_MIN) {
    chunks.push({
      text: currentChunk,
      index: chunkIndex,
      type: classifyChunkType(currentChunk),
      keywords: extractKeywords(currentChunk),
    });
  }

  return chunks;
}

async function generateEmbeddings(chunks) {
  if (chunks.length === 0) return [];

  const texts = chunks.map(c => c.text);

  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: texts,
    dimensions: 1536,
  });

  return response.data.map(item => item.embedding);
}

async function processDocument(doc) {
  console.log(`\nProcessing: ${doc.filename}`);
  console.log(`  Site: ${doc.site_id}`);
  console.log(`  Text length: ${doc.extracted_text?.length || 0} chars`);

  if (!doc.extracted_text || doc.extracted_text.length < 100) {
    console.log('  Skipping: Not enough text');
    return 0;
  }

  // Delete existing embeddings
  await supabase
    .from('document_embeddings')
    .delete()
    .eq('document_id', doc.id);

  // Chunk the document
  const chunks = chunkDocument(doc.extracted_text);
  console.log(`  Chunks created: ${chunks.length}`);

  if (chunks.length === 0) {
    console.log('  Skipping: No chunks generated');
    return 0;
  }

  // Generate embeddings
  const embeddings = await generateEmbeddings(chunks);
  console.log(`  Embeddings generated: ${embeddings.length}`);

  // Store embeddings
  const embeddingData = chunks.map((chunk, index) => ({
    project_id: doc.site_id,
    document_id: doc.id,
    chunk_text: chunk.text,
    chunk_index: chunk.index,
    chunk_type: chunk.type,
    keywords: chunk.keywords,
    metadata: { length: chunk.text.length },
    embedding: JSON.stringify(embeddings[index]),
  }));

  const { error } = await supabase
    .from('document_embeddings')
    .insert(embeddingData);

  if (error) {
    console.log(`  Error storing: ${error.message}`);
    return 0;
  }

  console.log(`  Stored ${embeddingData.length} embeddings`);
  return embeddingData.length;
}

async function main() {
  console.log('=== Generating Embeddings for ALL Documents ===\n');

  // Get all documents with extracted text
  const { data: docs, error } = await supabase
    .from('documents')
    .select('id, site_id, filename, extracted_text')
    .not('extracted_text', 'is', null);

  if (error) {
    console.error('Error fetching documents:', error);
    return;
  }

  console.log(`Found ${docs.length} documents with text\n`);

  let totalEmbeddings = 0;

  for (const doc of docs) {
    try {
      const count = await processDocument(doc);
      totalEmbeddings += count;
    } catch (err) {
      console.error(`  Failed: ${err.message}`);
    }
  }

  // Verify final count
  const { count: finalCount } = await supabase
    .from('document_embeddings')
    .select('id', { count: 'exact', head: true });

  console.log('\n=== Summary ===');
  console.log(`Documents processed: ${docs.length}`);
  console.log(`Total embeddings created: ${totalEmbeddings}`);
  console.log(`Final embedding count in DB: ${finalCount}`);
}

main().catch(console.error);
