# Browser Control Skill

Advanced browser automation and testing patterns.

## DOM Inspection

### Get Page Structure

```
get_dom_tree(projectId: "...", maxDepth: 5)
```

Returns hierarchical DOM with IDs, classes, and text.

### Find Specific Element

```
get_element_info(projectId: "...", selector: "#login-button")
```

Returns: tag, attributes, position, computed styles.

### Highlight for Visual Debugging

```
highlight_element(projectId: "...", selector: ".nav-item")
```

Flashes red/yellow border for 2 seconds.

## Form Interaction

### Fill Input Field

```
type_text(
  projectId: "...",
  selector: "#email",
  text: "user@example.com"
)
```

Triggers input and change events.

### Click Button

```
click_element(projectId: "...", selector: "#submit")
```

### Get Form Values

```javascript
execute_js(projectId: "...", code: `
  ({
    email: document.querySelector('#email').value,
    password: document.querySelector('#password').value
  })
`)
```

Returns object with form values.

## Testing Patterns

### Check for Error Messages

```javascript
execute_js(projectId: "...", code: `
  document.querySelector('.error-message')?.textContent || null
`)
```

### Verify Element Visibility

```javascript
execute_js(projectId: "...", code: `
  const el = document.querySelector('#success-banner');
  el && window.getComputedStyle(el).display !== 'none'
`)
```

### Count Elements

```javascript
execute_js(projectId: "...", code: `
  document.querySelectorAll('.task-item').length
`)
```

## Console Debugging

### Get All Logs

```
get_console_logs(projectId: "...")
```

Shows log/warn/error messages.

### Get Only Errors

```
get_recent_errors(projectId: "...")
```

Focused error list.

### Clear Logs

```
clear_console_logs(projectId: "...")
```

Start fresh for new test.

## Responsive Testing

### Mobile View

```
set_viewport(projectId: "...", width: 393, height: 852)  # iPhone 14
```

### Tablet View

```
set_viewport(projectId: "...", width: 1024, height: 1366)  # iPad Pro
```

### Desktop View

```
set_viewport(projectId: "...", width: 1920, height: 1080)
```

## Multi-Tab Workflows

### List All Tabs

```
list_tabs(projectId: "...")
```

### Switch Context

```
switch_tab(projectId: "...", index: 1)
```

### Create Specialized Tabs

- "API Docs" → http://localhost:1731
- "Storybook" → http://localhost:6006
- "Admin Panel" → http://localhost:1729/admin

Always use **short, clear names**.
