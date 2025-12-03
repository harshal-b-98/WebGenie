# Supabase Setup Instructions

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign in or create an account
3. Click "New Project"
4. Fill in:
   - Project Name: `WebCreationGenie` (or your preferred name)
   - Database Password: (generate a strong password and save it)
   - Region: Choose closest to your users
5. Click "Create new project" and wait for setup to complete (~2 minutes)

## Step 2: Get API Keys

1. In your Supabase project, go to **Settings** → **API**
2. Copy the following and add to your `.env.local` file:
   - `NEXT_PUBLIC_SUPABASE_URL` - Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Project API key (anon, public)
   - `SUPABASE_SERVICE_ROLE_KEY` - Service role key (secret)

## Step 3: Run Database Schema

1. In Supabase, go to **SQL Editor**
2. Click "New query"
3. Copy the entire contents of `lib/db/schema.sql`
4. Paste into the SQL Editor
5. Click "Run" (bottom right)
6. Verify all tables were created by going to **Database** → **Tables**

You should see these tables:

- user_profiles
- workspaces
- sites
- conversations
- messages
- site_versions
- documents
- assets

## Step 4: Configure Storage Buckets

1. Go to **Storage** in Supabase dashboard
2. Create two buckets:

### Bucket 1: `documents`

- Name: `documents`
- Public: `false` (private)
- File size limit: 10MB
- Allowed MIME types: `application/pdf`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`

### Bucket 2: `assets`

- Name: `assets`
- Public: `true` (public)
- File size limit: 5MB
- Allowed MIME types: `image/*`

## Step 5: Configure Authentication

1. Go to **Authentication** → **Providers**
2. Enable **Email** provider (should be enabled by default)
3. Enable **Google** OAuth:
   - Toggle "Google Enabled"
   - Add your Google OAuth credentials (optional for now, can set up later)
4. Go to **Authentication** → **URL Configuration**
   - Site URL: `http://localhost:3000` (for development)
   - Redirect URLs: Add `http://localhost:3000/auth/callback`

## Step 6: Generate TypeScript Types

Run this command in your terminal:

```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > lib/db/types.ts
```

Replace `YOUR_PROJECT_ID` with your actual Supabase project ID (found in Settings → General).

## Step 7: Verify Setup

Create a `.env.local` file in your project root:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# OpenAI
OPENAI_API_KEY=your_openai_api_key_here

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Node Environment
NODE_ENV=development
```

## Done! ✅

Your Supabase project is now ready. You can proceed with the next development tasks.
