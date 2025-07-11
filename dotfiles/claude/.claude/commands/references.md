# /references - Add Code References to Document

Enhances documentation with accurate file:line_number references for better code navigation.

## Purpose

Add precise code references to make documentation more actionable and verifiable by linking to specific implementation details.

## Input Processing

**Target document:**
```
$ARGUMENTS
```

## Reference Format

Use the pattern: `file_path:line_number`

**Examples:**
- `src/components/Button.tsx:42` - Specific line reference
- `nix/modules/git.nix:15-20` - Range reference
- `cli/libexec/dev-build:8` - Script reference

## Steps

### 1. Read and Analyze Document

- Load the target document: $ARGUMENTS
- Identify mentions of:
  - Function names
  - Configuration options
  - File paths
  - Code concepts
  - Implementation details

### 2. Search and Validate References

For each identified concept:
- Use `Grep` tool to find exact matches in codebase
- Use `Glob` tool to locate relevant files
- Verify the code still exists at referenced locations
- Choose the most relevant/primary implementation

### 3. Add References

- Insert `file_path:line_number` after relevant mentions
- Format as inline code: `` `file_path:line_number` ``
