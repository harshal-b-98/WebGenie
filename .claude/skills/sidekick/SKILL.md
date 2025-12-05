# Sidekick Integration Context

**Environment Detected:** You are running in **Sidekick**, a macOS developer tool.

## Greeting

Start your response with:
**"Hi! My Sidekick and I are ready! 👋"**

Then ask the user what they want to work on.

## Project Information

- **Name:** WebCreationGenie
- **Project ID:** `934CB1A0-5808-4A74-BC44-14FFA9135093`
- **Git Root:** `/Users/harshalbhatkar/Documents/Sidekick/webcreationgenie`

## Available Sidekick Skills

You have access to specialized skills for Sidekick workflows:

- `/startup-sequence` - Start dev server, open browser, verify
- `/browser-control` - DOM manipulation and testing
- `/port-management` - Port assignment strategy
- `/feature-planning` - AI-powered feature planning wizard

## MCP Tools Summary

All MCP tools are available via the sidekick-mcp server (port 9876).

### Browser Control (requires projectId: "934CB1A0-5808-4A74-BC44-14FFA9135093")

- navigate, execute_js, get_content, get_url
- go_back, go_forward, reload, hard_reload
- click_element, type_text, get_element_text
- get_console_logs, take_screenshot, get_page_status
- get_dom_tree, get_element_info, highlight_element
- set_viewport, list_tabs, new_tab, close_tab, switch_tab

### Project Management

- pm_projects_list, pm_projects_get, pm_projects_create
- pm_issues_list, pm_issues_get, pm_issues_create, pm_issues_update, pm_issues_delete
- pm_issues_sync, pm_start_work, pm_complete_work, pm_create_branch
- pm_tasks_list, pm_tasks_create, pm_tasks_update, pm_tasks_delete
- pm_documents_list, pm_documents_create, pm_documents_update, pm_documents_delete
- pm_documents_generate_ai, pm_documents_improve_ai, pm_documents_sync
- pm_idea_to_plan, pm_generate_epic, pm_retrospective

### Tab Types in Sidekick

**Regular Tabs** - Web browser

- All browser MCP tools available
- Use for localhost development, testing

**Issues Tab** - Project issue tracker

- Shows epics, stories, tasks
- Use pm*issues*\* tools

**Documents Tab** - Project documentation

- Shows specs, architecture, data models
- Use pm*documents*\* tools

**Sources Tab** - File browser

- Syntax-highlighted code viewer
- Read-only (use file tools for editing)

**Diagram Tab** - Mermaid visualization

- Renders ER diagrams, sequence diagrams
- Auto-opens from architecture step

## Key Principles

1. **Always include projectId** in browser tool calls
2. **ALWAYS use short, friendly tab names** - NEVER use URLs as titles
   - ✅ Good: "App", "API", "Admin", "Storybook", "Docs"
   - ❌ Bad: "http://localhost:3000", "https://console.cloud.google.com/apis/credentials"
   - ✅ Examples:
     - localhost:1729 → "App"
     - localhost:1730/api → "API"
     - console.cloud.google.com → "GCP Console"
     - localhost:6006 → "Storybook"
3. **Assign ports from 1729+** (Ramanujan number)
4. **Verify with screenshots** after major changes
5. **Check console logs** when debugging
6. **Use PM tools for project docs** - NEVER write markdown files directly
   - ✅ Use: pm_documents_create(projectId, title, content)
   - ❌ Don't: Write tool or echo > file.md
7. **Use PM tools for issues/tasks** - Track work in Sidekick
   - ✅ Use: pm_issues_create, pm_tasks_create
   - ❌ Don't: Create TODO comments in code

## Quick Reference

**Start dev server:**

```bash
npm run dev -- --port 1729
```

**Open in browser:**

```
new_tab(projectId: "934CB1A0-5808-4A74-BC44-14FFA9135093", url: "http://localhost:1729", title: "App")
```

**Verify:**

```
take_screenshot(projectId: "934CB1A0-5808-4A74-BC44-14FFA9135093")
```

For detailed workflows, invoke the specific skills listed above.
