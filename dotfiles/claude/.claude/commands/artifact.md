# /artifact - Create Documentation Artifact

Extract a markdown document from this conversation for future reference.

## Purpose

Generate documentation that captures key insights, decisions, plans or implementations from the current conversation.

## Input Processing

**User-specified topic:**
```
$ARGUMENTS
```

If no topic is provided, analyze conversation for:
- Latest implementation plan
- Key technical decisions  
- Problem-solution pairs
- Any kind of "change"

## Output Requirements

### File Naming Convention

- Use kebab-case: `topic-name.md`
- Include date if temporal: `feature-implementation-2024-07.md`
- Place in `docs/` directory
- Avoid spaces and special characters
