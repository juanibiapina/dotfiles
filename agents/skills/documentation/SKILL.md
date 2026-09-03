---
name: documentation
description: "Use when writing plans, documentation, code comments, commit messages, PR descriptions."
---

# Documentation

- Every fact has one source of truth across all types of documentation, never duplicate
- It's ok to move pieces of documentation around as it grows
- Flag when a fact needs to be updated in two places so it can be followed up on
- Use direct sentences. Avoid "X, not Y".
- Use the Minto Pyramid for designing document structure

## Writing comments

1. **Name the mechanism.** Use barrel, export, import — the words that appear in the code. "A service is imported through `services/<name>`", not "a service has two doors".
2. **Stop at the fact.** No contrastive tail, no restating a point a second way. "Asserts the export list of `admin.ts`" is enough.
3. **Length tracks the code.** A file whose body is one `export` line does not carry 36 lines of comment.
4. **Keep only non-obvious justification.** Why `UserStore` is package-private — it can produce a blind index and look up credentials by email — stays, because a reader cannot infer it. Why a test asserts an exact export list does not.
5. **State the present.** Write what the code does now. "Nothing here delivers it", not "…until the self-serve flow can mail one". Same for naming a command or module that does not exist yet. The one exception is a staged delivery that is written down and underway; then name the stage.
