#!/usr/bin/env node
/**
 * Migration script: Local Supabase → Cloud Supabase
 * Replaces local user IDs with cloud user IDs
 */

const LOCAL_URL = 'http://127.0.0.1:54331';
const LOCAL_KEY = 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz';

const CLOUD_URL = 'https://cfhssgueszhoracjeyou.supabase.co';
const CLOUD_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const LOCAL_USER_ID = '00b8859c-cdc9-4997-94bc-6d999a703195';
const CLOUD_USER_ID = '5bf780f2-a9a4-4241-b26e-8daeca1291d7';

if (!CLOUD_KEY) {
  console.error('Error: SUPABASE_SERVICE_ROLE_KEY environment variable required');
  console.error('Run with: SUPABASE_SERVICE_ROLE_KEY=your_key node scripts/migrate-to-cloud.mjs');
  process.exit(1);
}

async function fetchLocal(table, select = '*') {
  const res = await fetch(`${LOCAL_URL}/rest/v1/${table}?select=${select}`, {
    headers: {
      'apikey': LOCAL_KEY,
      'Authorization': `Bearer ${LOCAL_KEY}`,
    }
  });
  if (!res.ok) throw new Error(`Failed to fetch ${table}: ${res.statusText}`);
  return res.json();
}

async function insertCloud(table, data) {
  if (!data || data.length === 0) {
    console.log(`  ⏭️  ${table}: No data to migrate`);
    return;
  }

  const res = await fetch(`${CLOUD_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      'apikey': CLOUD_KEY,
      'Authorization': `Bearer ${CLOUD_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify(data)
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Failed to insert ${table}: ${res.statusText} - ${error}`);
  }

  console.log(`  ✅ ${table}: ${data.length} rows migrated`);
}

async function updateCloud(table, id, data) {
  const res = await fetch(`${CLOUD_URL}/rest/v1/${table}?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      'apikey': CLOUD_KEY,
      'Authorization': `Bearer ${CLOUD_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify(data)
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Failed to update ${table}: ${res.statusText} - ${error}`);
  }
}

function replaceUserId(data, fields = ['user_id', 'owner_id', 'created_by']) {
  return data.map(row => {
    const newRow = { ...row };
    for (const field of fields) {
      if (newRow[field] === LOCAL_USER_ID) {
        newRow[field] = CLOUD_USER_ID;
      }
    }
    return newRow;
  });
}

async function migrate() {
  console.log('🚀 Starting migration: Local → Cloud\n');
  console.log(`   Local user:  ${LOCAL_USER_ID}`);
  console.log(`   Cloud user:  ${CLOUD_USER_ID}\n`);

  try {
    // 1. Migrate user_profiles
    console.log('1️⃣  Migrating user_profiles...');
    const profiles = await fetchLocal('user_profiles');
    const cloudProfiles = profiles.map(p => ({
      ...p,
      id: CLOUD_USER_ID // Profile ID = User ID
    }));
    await insertCloud('user_profiles', cloudProfiles);

    // 2. Migrate workspaces
    console.log('2️⃣  Migrating workspaces...');
    const workspaces = await fetchLocal('workspaces');
    await insertCloud('workspaces', replaceUserId(workspaces));

    // 3. Migrate sites (without current_version_id to avoid FK issues)
    console.log('3️⃣  Migrating sites...');
    const sites = await fetchLocal('sites');
    const sitesWithoutVersion = sites.map(s => ({
      ...replaceUserId([s])[0],
      current_version_id: null // Set later after versions are imported
    }));
    await insertCloud('sites', sitesWithoutVersion);

    // 4. Migrate conversations
    console.log('4️⃣  Migrating conversations...');
    const conversations = await fetchLocal('conversations');
    await insertCloud('conversations', replaceUserId(conversations));

    // 5. Migrate messages
    console.log('5️⃣  Migrating messages...');
    const messages = await fetchLocal('messages');
    await insertCloud('messages', messages); // No user_id in messages

    // 6. Migrate site_versions
    console.log('6️⃣  Migrating site_versions...');
    const versions = await fetchLocal('site_versions');
    await insertCloud('site_versions', replaceUserId(versions));

    // 7. Migrate documents
    console.log('7️⃣  Migrating documents...');
    const documents = await fetchLocal('documents');
    await insertCloud('documents', replaceUserId(documents));

    // 8. Migrate assets
    console.log('8️⃣  Migrating assets...');
    const assets = await fetchLocal('assets');
    await insertCloud('assets', replaceUserId(assets));

    // 9. Update sites with current_version_id
    console.log('9️⃣  Updating sites with current_version_id...');
    for (const site of sites) {
      if (site.current_version_id) {
        await updateCloud('sites', site.id, { current_version_id: site.current_version_id });
      }
    }
    console.log(`  ✅ Updated ${sites.filter(s => s.current_version_id).length} sites`);

    console.log('\n✨ Migration completed successfully!\n');

    // Print summary
    console.log('📊 Summary:');
    console.log(`   - Workspaces: ${workspaces.length}`);
    console.log(`   - Sites: ${sites.length}`);
    console.log(`   - Conversations: ${conversations.length}`);
    console.log(`   - Messages: ${messages.length}`);
    console.log(`   - Site versions: ${versions.length}`);
    console.log(`   - Documents: ${documents.length}`);
    console.log(`   - Assets: ${assets.length}`);

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  }
}

migrate();
