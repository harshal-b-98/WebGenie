# Port Management Skill

Port assignment strategy for Sidekick projects with persistent tracking.

## Ramanujan Number Base: 1729

Start port assignments from **1729** (Ramanujan number: smallest number expressible as sum of two cubes in two ways).

## Port Registry (REQUIRED)

**Always maintain** `.sidekick/ports.json` in project root:

```json
{
  "dev": 1729,
  "api": 1730,
  "docs": 1731
}
```

## Workflow: Start Server with Port Tracking

### 1. Try Preferred Port

```bash
npm run dev -- --port 1729
```

### 2. Detect Actual Port

Node may start on different port if 1729 is busy. Check output:

```
Local: http://localhost:1730  ← Note actual port!
```

### 3. ALWAYS Update Registry

```bash
# Create or update .sidekick/ports.json
cat > .sidekick/ports.json << EOF
{
  "dev": 1730
}
EOF
```

### 4. Use Registered Port for Browser

```
# Read from registry
PORT=$(cat .sidekick/ports.json | grep dev | grep -o '[0-9]*')
new_tab(projectId: "...", url: "http://localhost:$PORT", title: "App")
```

## Port Assignment Rules

1. **Check registry first**: Read `.sidekick/ports.json` before starting
2. **Try registered port**: Use port from registry if available
3. **Detect actual port**: Parse server output for actual port
4. **Update registry immediately**: After server starts, update JSON
5. **Reuse consistently**: Next session uses same port

## Starting Servers with Port Detection

### Vite

```bash
# Try preferred port
npm run dev -- --port 1729 2>&1 | tee /tmp/vite-output.log &

# Wait for startup
sleep 3

# Detect actual port
ACTUAL_PORT=$(grep -o 'localhost:[0-9]*' /tmp/vite-output.log | head -1 | cut -d: -f2)

# Update registry
echo "{\"dev\": $ACTUAL_PORT}" > .sidekick/ports.json
```

### Next.js

```bash
npm run dev -- -p 1729 2>&1 | tee /tmp/next-output.log &
sleep 3
ACTUAL_PORT=$(grep -o 'localhost:[0-9]*' /tmp/next-output.log | head -1 | cut -d: -f2)
echo "{\"dev\": $ACTUAL_PORT}" > .sidekick/ports.json
```

### Generic (Parse Output)

```bash
npm run dev 2>&1 | tee /tmp/server.log &
sleep 3

# Look for common patterns
ACTUAL_PORT=$(grep -E 'localhost:[0-9]+|:[0-9]+ ' /tmp/server.log | grep -o '[0-9]{4,5}' | head -1)

# Update registry
mkdir -p .sidekick
echo "{\"dev\": ${ACTUAL_PORT:-1729}}" > .sidekick/ports.json
```

## Reading Registry

### Before Starting Server

```bash
if [ -f .sidekick/ports.json ]; then
  PREFERRED_PORT=$(cat .sidekick/ports.json | grep dev | grep -o '[0-9]*')
  npm run dev -- --port $PREFERRED_PORT
else
  # First time - use 1729
  npm run dev -- --port 1729
fi
```

### For Browser Tab

```bash
DEV_PORT=$(cat .sidekick/ports.json | grep dev | grep -o '[0-9]*' || echo "1729")
```

Then use in MCP call.

## Multiple Services

```json
{
  "dev": 1729,
  "api": 1730,
  "docs": 1731,
  "admin": 1732
}
```

Each service gets tracked separately.

## Port Conflicts

If port occupied:

1. **Let Node auto-assign** next available port
2. **Detect from output** (don't guess)
3. **Update registry** with actual port
4. **Reuse that port** in future sessions

## Best Practices

- ✅ **Always update registry** after starting any server
- ✅ **Read registry** before creating browser tabs
- ✅ **Parse server output** to detect actual port (don't assume)
- ✅ **Commit ports.json** to git (team shares port assignments)
- ❌ **Don't hardcode ports** in browser commands

## Why Track Ports?

- Consistency across sessions
- Team coordination (shared ports.json)
- Handles conflicts automatically
- Browser tabs always point to correct port
- No manual port lookup needed

## Example Complete Workflow

```bash
# 1. Check registry
if [ -f .sidekick/ports.json ]; then
  PORT=$(cat .sidekick/ports.json | grep dev | grep -o '[0-9]*')
else
  PORT=1729
fi

# 2. Start server
npm run dev -- --port $PORT 2>&1 | tee /tmp/dev.log &

# 3. Wait and detect
sleep 4
ACTUAL=$(grep -o 'localhost:[0-9]*' /tmp/dev.log | head -1 | cut -d: -f2)

# 4. Update registry
mkdir -p .sidekick
echo "{\"dev\": ${ACTUAL:-$PORT}}" > .sidekick/ports.json

# 5. Open browser with actual port
```

Then use MCP tool with detected port.
