# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js 16 application using the App Router architecture with TypeScript, React 19, and Tailwind CSS v4.

## Development Commands

- **Start dev server**: `npm run dev` (default port: 3000)
- **Build for production**: `npm run build`
- **Start production server**: `npm start`
- **Run linter**: `npm run lint`

## Architecture

### Framework & Routing

- **Next.js 16 with App Router**: All routes are defined in the `app/` directory
- **File-based routing**: Each folder in `app/` represents a route segment
- **Server Components by default**: Components are Server Components unless marked with `"use client"`
- **Layout system**: Root layout (`app/layout.tsx`) wraps all pages and defines global metadata

### Styling

- **Tailwind CSS v4**: Uses PostCSS plugin `@tailwindcss/postcss`
- **CSS Variables**: Theme variables defined in `app/globals.css` using Tailwind's `@theme inline` directive
- **Dark mode**: Automatic dark mode support via `prefers-color-scheme` media query
- **Custom fonts**: Geist Sans and Geist Mono loaded via `next/font/google` with CSS variables

### TypeScript Configuration

- **Path aliases**: `@/*` maps to project root (e.g., `@/app/page.tsx`)
- **Strict mode enabled**: Full TypeScript strict checking
- **Target**: ES2017 for modern browser compatibility

### ESLint

- Uses Next.js recommended ESLint configurations: `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`
- Ignores: `.next/`, `out/`, `build/`, `next-env.d.ts`

## Key Conventions

- **Image optimization**: Use `next/image` component for all images (see `app/page.tsx:7-14`)
- **Font variables**: Apply font CSS variables to elements using `className` (see `app/layout.tsx:28`)
- **Metadata**: Define page metadata using `metadata` export in layouts/pages (see `app/layout.tsx:15-18`)
- **CSS custom properties**: Use `--background` and `--foreground` variables for theming

## Project Structure

```
app/
  ├── layout.tsx       # Root layout with global metadata and font configuration
  ├── page.tsx         # Home page (default route /)
  └── globals.css      # Global styles with Tailwind imports and theme variables
```

## Work Management & Git Workflow

### Issue Hierarchy (MANDATORY)

All work must follow this strict hierarchy:

- **Epic** → **Stories** → **Tasks**

**Rules:**

1. Every **Story** MUST be linked to an **Epic** using `epicId` parameter
2. Every **Task** MUST be linked to a **Story** using `issueId` parameter
3. Never create orphaned stories or tasks without proper parent linkage

**Example workflow:**

```
1. Create Epic: pm_issues_create(type: "epic", title: "User Authentication")
2. Create Stories: pm_issues_create(type: "story", epicId: "<epic-id>", title: "Login UI")
3. Create Tasks: pm_tasks_create(issueId: "<story-id>", title: "Build login form component")
```

### Epic Completion Workflow

When an Epic is completed, follow these steps **in order**:

1. **Test Acceptance Criteria**: Verify all acceptance criteria for the epic are met
2. **If tests PASS**:
   - Commit all code changes
   - Push to repository: `https://github.com/harshal-b-98/WebGenie.git`
   - Mark epic as complete using `pm_complete_work(issueId: "<epic-id>")`
3. **If tests FAIL**:
   - Create a **Bug** issue (NOT a task or story): `pm_issues_create(type: "bug", ...)`
   - Link bug to the failed story/epic
   - Fix the bug before marking epic as complete
   - Never proceed with incomplete or failing acceptance criteria

**Important**: Every epic completion MUST include a git commit and push to the repository.

## Important Notes

- This project uses **React 19.2.0** which has breaking changes from React 18
- **Tailwind v4** has a different configuration approach (no `tailwind.config.js`, uses `@theme inline` in CSS)
- All components are Server Components by default; add `"use client"` directive only when needed for client-side interactivity
- **Repository**: `https://github.com/harshal-b-98/WebGenie.git`
