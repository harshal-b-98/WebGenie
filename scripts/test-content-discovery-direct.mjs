/**
 * Direct test of content discovery to see actual errors
 */

import { createClient } from '@supabase/supabase-js';
import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';

const siteId = 'dbdcab8e-7a49-4fcf-9a56-c7283081bfee'; // BevTest6

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const openaiKey = process.env.OPENAI_API_KEY;

console.log('🧪 Testing Content Discovery Direct\n');
console.log('Environment Check:');
console.log('- Supabase URL:', supabaseUrl ? '✅' : '❌ MISSING');
console.log('- Supabase Key:', supabaseKey ? '✅' : '❌ MISSING');
console.log('- OpenAI Key:', openaiKey ? '✅' : '❌ MISSING');
console.log();

if (!supabaseUrl || !supabaseKey || !openaiKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const openai = createOpenAI({ apiKey: openaiKey });
const chatModel = openai('gpt-4o-mini');

console.log(`📁 Site ID: ${siteId}\n`);

try {
  // Step 1: Get documents
  console.log('Step 1: Fetching documents...');
  const { data: docs, error: docsError } = await supabase
    .from('documents')
    .select('filename, processing_status, extracted_text')
    .eq('site_id', siteId);

  if (docsError) throw new Error(`Documents fetch failed: ${docsError.message}`);

  console.log(`✅ Found ${docs.length} documents`);
  docs.forEach(d => {
    console.log(`   - ${d.filename}: ${d.processing_status} (${d.extracted_text?.length || 0} chars)`);
  });

  const documentContent = docs
    .filter(d => d.extracted_text && d.extracted_text.trim().length > 0)
    .map(d => `--- Document: ${d.filename} ---\n${d.extracted_text}`)
    .join('\n\n');

  console.log(`\n✅ Total content: ${documentContent.length} characters\n`);

  if (documentContent.length < 100) {
    throw new Error('Insufficient document content');
  }

  // Step 2: Call OpenAI for content discovery
  console.log('Step 2: Calling OpenAI for content discovery...');
  const truncatedContent = documentContent.substring(0, 50000);

  const prompt = `Analyze the following business documents and extract the content structure.

DOCUMENTS:
${truncatedContent.substring(0, 5000)}... (truncated for test)

Return a JSON object with this structure:
{
  "segments": [
    {
      "id": "unique-id",
      "name": "Segment Name",
      "slug": "segment-slug",
      "description": "Brief description",
      "items": [],
      "suggestedInteractions": ["view-details"],
      "priority": 1
    }
  ],
  "maxDepth": 2,
  "leadCapturePoints": ["demo", "contact"],
  "primaryCTA": { "text": "Get Started", "action": "contact", "style": "primary" },
  "secondaryCTAs": [],
  "businessType": "product",
  "analysisConfidence": 0.8
}`;

  const { text: rawResponse } = await generateText({
    model: chatModel,
    system: 'You are a content structure analyzer. Analyze documents and return JSON only.',
    prompt,
    temperature: 0.3,
    maxTokens: 4000,
  });

  console.log('✅ OpenAI responded\n');
  console.log('Raw response (first 500 chars):');
  console.log(rawResponse.substring(0, 500));
  console.log();

  // Step 3: Parse JSON
  console.log('Step 3: Parsing JSON response...');
  let cleanedResponse = rawResponse.trim();
  if (cleanedResponse.startsWith('```json')) {
    cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleanedResponse.startsWith('```')) {
    cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }

  const result = JSON.parse(cleanedResponse);
  console.log('✅ JSON parsed successfully\n');
  console.log('Discovered segments:');
  result.segments.forEach((s, i) => {
    console.log(`   ${i + 1}. ${s.name} (${s.slug}) - ${s.description}`);
  });
  console.log(`\nBusiness Type: ${result.businessType}`);
  console.log(`Confidence: ${result.analysisConfidence}`);

  // Step 4: Save to database
  console.log('\nStep 4: Saving to database...');
  const { data: saved, error: saveError } = await supabase
    .from('site_content_structure')
    .upsert({
      site_id: siteId,
      business_type: result.businessType,
      segments: result.segments,
      max_depth: result.maxDepth,
      lead_capture_points: result.leadCapturePoints,
      primary_cta: result.primaryCTA,
      secondary_ctas: result.secondaryCTAs,
      analysis_confidence: result.analysisConfidence,
      document_hash: 'test-hash',
      last_analyzed_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (saveError) throw new Error(`Database save failed: ${saveError.message}`);

  console.log('✅ Saved to database\n');
  console.log('═══════════════════════════════════════');
  console.log('🎉 Content Discovery SUCCESS!');
  console.log('═══════════════════════════════════════');

} catch (error) {
  console.error('\n❌ Content Discovery FAILED');
  console.error('Error:', error.message);
  console.error('\nStack trace:');
  console.error(error.stack);
  process.exit(1);
}
