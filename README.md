

## Markdown Format Guide

Text-to-Workspace supports creating workspaces from a flexible Markdown structure. This allows the app to work fully offline and lets users generate content using any editor or external LLM.

### Supported Format

```md
Workspace Title

# Group Name
- Subtask
* Subtask
+ Subtask

## Another Group
- Subtask
- Subtask
```

### Parsing Rules

* **First line** is treated as the workspace title
* Any heading level (`#`, `##`, `###`, etc.) is treated as a **group**
* List items starting with `-`, `*`, or `+` are treated as **subtasks**
* Groups can contain any number of subtasks
* Extra Markdown styling is ignored during parsing

### Example

```md
Quantum Mechanics – Beginner

# Foundations
- Mathematical prerequisites
* Classical mechanics review

## Core Concepts
+ Wave functions
- Schrödinger equation
```

This relaxed format makes it easy to reuse Markdown from notes, documents, or LLM-generated output without manual cleanup.

---
