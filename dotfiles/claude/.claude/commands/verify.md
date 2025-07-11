# /verify - Verify Document Correctness

Validates documentation accuracy against actual codebase implementation to ensure reliability and currency.

## Purpose

Systematically verify that all claims, references, and instructions in documentation match the current state of the code.

## Input Processing

**Target document:**
```
$ARGUMENTS
```

## Verification Scope

### Technical Claims

- Function signatures and behavior
- Configuration options and defaults
- File paths and directory structures
- Code examples and snippets
- Installation/setup instructions

### References and Links

- File:line_number references
- Internal documentation links
- External dependencies
- Command examples

## Steps

### 1. Parse Document Content

- Read the document: $ARGUMENTS
- Extract all verifiable claims and statements
- Identify code references, examples, and instructions
- Catalog file paths and line number references

### 2. Verify Code References

For each file:line_number reference:
- Use `Read` tool to check file exists
- Verify line number contains expected content
- Confirm code matches described functionality
- Check for recent changes that might affect accuracy

### 3. Validate Code Examples

- Extract code blocks from documentation
- Compare against actual implementation
- Verify syntax and completeness
- Check that examples are current
