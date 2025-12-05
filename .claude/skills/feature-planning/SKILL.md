# Feature Planning Skill

Guide for using Sidekick's AI-powered feature planning system.

## When to Suggest

Suggest feature planning when user:

- Describes a new feature idea (2+ sentences)
- Says "I want to add..."
- Asks "How should I implement..."
- Needs to plan sprint/epic work

## Quick Invocation

```
pm_idea_to_plan(
  idea: "User's feature description",
  projectId: "<from context.md>"
)
```

This fully automates:

1. Specification document generation
2. Architecture design with diagrams
3. Epic structure (analyze existing, propose new/updates)
4. User story breakdown
5. Implementation tasks
6. Full traceability

## Manual Workflow (Alternative)

If user prefers interactive wizard:

1. Tell user: "Press **Cmd+Shift+F** to open feature planning wizard"
2. They'll go through 7-step guided process
3. Can provide feedback at each step
4. Review before final creation

## Wizard Steps

1. **Idea Entry** - User describes feature
2. **Project Detection** - AI finds best-fit project
3. **Specification** - Requirements document (streams)
4. **Architecture** - System design + Mermaid diagrams (streams)
5. **Epics** - Multiple epics, CREATE vs UPDATE (streams as cards)
6. **Stories** - User stories with acceptance criteria (streams)
7. **Tasks** - Implementation tasks (optional)
8. **Review** - Batch create everything

## Generated Artifacts

### Documents Created

- **Original Idea** (tag: idea)
- **Specification** (tag: specification)
- **Architecture** (tag: architecture)
- **Data Model** (tag: data-model)

### Issues Created

- **Epics** - Top-level features
- **Stories** - User stories linked to epics
- **Tasks** - Implementation tasks assigned to stories

### Traceability

- Issues have `sourceDocumentId`, `sourceQuote`
- Documents have `linkedIssueIds`
- Full chain: Idea → Spec → Epic → Story → Task

## Working with Generated Plans

### View Issues

```
pm_issues_list(projectId: "...")
```

Shows all issues including AI-generated ones.

### Get Issue Details

```
pm_issues_get(issueId: "...")
```

Shows source document, quote, story points.

### Modify Plan

```
pm_issues_update(issueId: "...", epicId: "...", storyPoints: 8)
```

### Track Progress

```
pm_start_work(issueId: "...")
pm_complete_work(issueId: "...")
```

## Retrospective Analysis

After epic completion:

```
pm_retrospective(epicId: "...")
```

Compares original plan vs actual implementation.
Shows what was delivered, deferred, or added.

## Best Practices

- **One epic per major feature** - Don't over-split
- **Stories should be deliverable** - User-facing value
- **Tasks are implementation details** - Technical steps
- **Use feedback loop** - Regenerate epics if first pass isn't right
- **Review carefully** - Final step shows everything before creation
