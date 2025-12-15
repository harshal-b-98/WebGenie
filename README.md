# WebGenie - AI Website Generator

An AI-powered website generation platform built with Next.js 16, Supabase, and OpenAI/Anthropic.

## Features

- AI-powered website generation from business documents
- Dynamic UI generation with responsive design (mobile, tablet, desktop)
- Document processing with embeddings for intelligent content extraction
- Version management for generated websites
- One-click deployment to Vercel
- Real-time preview with refinement capabilities

## Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account (free tier works)
- OpenAI API key
- Anthropic API key (optional)

## Setup Instructions

### 1. Clone the repository

```bash
git clone https://github.com/harshal-b-98/WebGenie.git
cd WebGenie
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Copy the example environment file and fill in your values:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your actual values:

```env
# Supabase - Get these from your Supabase project settings
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# OpenAI - Get from https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-your_openai_api_key

# Anthropic (optional) - Get from https://console.anthropic.com/
ANTHROPIC_API_KEY=sk-ant-your_anthropic_api_key

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Node Environment
NODE_ENV=development
```

### 4. Set up Supabase Database

#### Option A: Using Supabase CLI (recommended)

```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref your-project-ref

# Run migrations
supabase db push
```

#### Option B: Manual SQL execution

1. Go to your Supabase dashboard > SQL Editor
2. Run each migration file in order from `supabase/migrations/` directory
3. Start with `20241205000000_initial_schema.sql` and proceed chronologically

### 5. Set up Storage Buckets

The migrations will create the required storage buckets, but ensure these exist:

- `documents` - For uploaded business documents
- `logos` - For company logos
- `generated-sites` - For generated website assets

### 6. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
webcreationgenie/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   ├── dashboard/         # Dashboard pages
│   └── auth/              # Authentication pages
├── components/            # React components
├── lib/                   # Utility libraries
│   ├── ai/               # AI prompts and generation
│   ├── auth/             # Authentication utilities
│   ├── db/               # Database client
│   ├── services/         # Business logic services
│   └── utils/            # Helper utilities
├── supabase/
│   └── migrations/       # Database migrations
└── public/               # Static assets
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: Supabase (PostgreSQL)
- **AI**: OpenAI GPT-4, Anthropic Claude
- **Styling**: Tailwind CSS v4
- **Authentication**: Supabase Auth
- **Deployment**: Vercel

## Environment Variables Reference

| Variable                        | Required | Description                          |
| ------------------------------- | -------- | ------------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`      | Yes      | Supabase project URL                 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes      | Supabase anonymous key               |
| `SUPABASE_SERVICE_ROLE_KEY`     | Yes      | Supabase service role key            |
| `OPENAI_API_KEY`                | Yes      | OpenAI API key                       |
| `ANTHROPIC_API_KEY`             | No       | Anthropic API key                    |
| `NEXT_PUBLIC_APP_URL`           | Yes      | Application URL                      |
| `NODE_ENV`                      | No       | Environment (development/production) |

## Troubleshooting

### Database connection issues

- Verify your Supabase URL and keys are correct
- Check if RLS policies are properly configured

### AI generation fails

- Verify your OpenAI API key is valid and has credits
- Check rate limits on your API keys

### Storage upload fails

- Ensure storage buckets exist with proper RLS policies
- Check file size limits in Supabase dashboard

## License

Private - All rights reserved
