# Startup Sequence Skill

Standard workflow to start a development server and verify it's running.

## Usage

Invoke this skill when user asks to:

- "Start the dev server"
- "Run the app"
- "Launch the project"

## Steps

### 1. Identify Package Manager & Command

Check package.json for scripts:

```bash
cat package.json | grep -A 5 '"scripts"'
```

Common patterns:

- `"dev": "vite"` → `npm run dev`
- `"dev": "next dev"` → `npm run dev`
- `"start": "react-scripts start"` → `npm start`

### 2. Assign Port (if not specified)

Use **1729** (Ramanujan number) as base port for this project.

If port is configurable:

```bash
npm run dev -- --port 1729
```

If not configurable, note the default port from output.

### 3. Wait for Server Ready

Watch for indicators:

- "ready in XXms"
- "Local: http://localhost:XXXX"
- "compiled successfully"

Typical wait: 3-5 seconds

### 4. Create Browser Tab

```
new_tab(
  projectId: "<from context.md>",
  url: "http://localhost:1729",
  title: "<short-name>"  # e.g., "App", "Frontend", "Admin"
)
```

### 5. Wait for Page Load

```
get_page_status(projectId: "...")
```

Check `isLoading: false` before proceeding.

### 6. Take Screenshot

```
take_screenshot(projectId: "...")
```

### 7. Verify & Confirm

Analyze screenshot:

- Page loaded (not blank/404)?
- No console errors?
- Expected content visible?

Respond to user:

```
✅ Dev server running on port 1729
✅ App loaded in browser tab "App"
✅ Verified via screenshot - homepage displaying correctly
```

## Error Handling

If server fails to start:

- Check console for errors
- Try different port (1730, 1731, etc.)
- Check if dependencies need installing

If page doesn't load:

- Check get_console_logs for errors
- Verify URL matches server output
- Try hard_reload

## Port Registry

Keep track of ports used:

- Primary dev server: 1729
- Backend API: 1730
- Docs server: 1731
- Additional services: 1732+

Store in project notes/docs for consistency.
