---
name: diff-diagrams
description: Create Mermaid architecture diagrams that visualize code changes as diffs from a baseline. Use when asked to diagram proposed changes, refactoring options, before/after architecture, or compare implementation approaches visually. Triggers on "diff diagram", "architecture diagram", "diagram the refactor", "before/after diagram", "visualize the changes", or any request to show code changes in diagrams.
---

# Diff Diagrams

Visualize proposed code changes as colored diffs over a baseline architecture diagram in Mermaid. The baseline shows the current state; each proposed change gets its own copy of the full diagram with additions and removals highlighted.

## Baseline First

Build the current-state diagram from code, not assumptions. Search and read to confirm every node, edge, and label matches reality. An inaccurate baseline makes diffs meaningless.

## One Diagram Per Option

Copy the full baseline for each variant. Don't merge multiple options into one diagram. The reader should see the complete system with changes highlighted in context.

## Mark Only What Changes

If only a method inside a node changes, mark that method text with a 🔵/🔴 emoji prefix. Keep the node's default styling. Apply `classDef` styling only to truly new or fully removed nodes.

## Color Convention

| Marker | Meaning | classDef |
|--------|---------|----------|
| 🔵 Blue | Added | `classDef added fill:#ddeeff,stroke:#0066cc,stroke-width:3px,color:#003366` |
| 🔴 Red | Removed / bypassed | `classDef removed fill:#ffdddd,stroke:#cc0000,stroke-width:3px,color:#660000` |

Include a legend above each diff diagram:
```markdown
> 🔵 Blue = added. 🔴 Red = removed. Diff from [baseline name].
```

## Mermaid Syntax

**New node** (entire node is new):
```
GW_V3["🔵 V3Handler<br/>POST /v1/spaces/:spaceId/..."]:::added
```

**Removed node:**
```
OLD_KV["🔴 CONFIGS_KV (bypassed)"]:::removed
```

**Changed method within an existing node** (node keeps default style):
```
PW_Entry["Profile (WorkerEntrypoint)<br/>v2 methods: unchanged<br/>🔵 v3 method: createProfileFromSpaceEnv()"]
```

**New edges** (color via `linkStyle` with zero-indexed edge number):
```
linkStyle 4,9 stroke:#0066cc,stroke-width:3px
```

**Removed/bypassed edges** (dashed + red):
```
A -.->|"bypassed"| B
linkStyle 12 stroke:#cc0000,stroke-width:2px
```

## Gotchas

- `linkStyle` indices are zero-based and count ALL edges in the diagram in declaration order. Adding or removing edges shifts all subsequent indices. Count carefully after every edit.
- When a node changes role (e.g., "unused" to "active"), use 🔵 text inside the label. Only use `:::added` if the node is genuinely new.
- Subgraph titles can't contain emoji in some Mermaid renderers. Put markers inside node labels instead.
