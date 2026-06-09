---
name: levels-of-abstraction
description: Use when discussing levels of abstraction, composed method, SLAP, stepdown rule, or mixed abstraction levels within a function.
---

# Levels of Abstraction

Every function should operate at a single level of abstraction. When a function calls high-level helpers *and* does low-level work inline, the reader has to constantly shift mental gears. The fix is always the same: give the low-level block a name.

## Terms

**Composed Method** _(Kent Beck, Smalltalk Best Practice Patterns, 1997)_
A public method that reads as an outline of steps. Each step is a call to a private method with a clear name. The public method states *what*; the private methods handle *how*.

**Single Level of Abstraction — SLA / SLAP** _(named by Neal Ford, The Productive Programmer, 2008; restated by Robert C. Martin, Clean Code, 2008)_
All statements in a function belong to the same level of abstraction. If one statement is at a lower level, extract it.

**Stepdown Rule** _(Robert C. Martin, Clean Code)_
Functions in a file read top-down: each function is followed by the functions one level of abstraction below it, like a newspaper article narrowing from headline to detail.

**Mental Grouping**
The cognitive work a reader does to assemble missing abstractions — scanning a block of code and figuring out "this chunk does X." A missing method forces the reader to do the extraction in their head.

## Smells

- **Helpers plus inline logic** — a function calls named methods for some steps, then has a raw block of code for another. The raw block is the missing method.
- **Comment, blank line, code block** — the comment is the name of the method that should exist. Extract and the comment becomes redundant.
- **Fat loop body** — loop control is one level; the body is a lower level. Extract the body.
- **Policy mixed with mechanism** — orchestration ("what to do") interleaved with detail ("how to do it") in the same function.

## Strategies

See [refactoring](../refactoring/SKILL.md) — Extract function and Extract class are the primary moves. Extract class applies when extract function would need too many parameters (a sign the parameters want to be fields of a cohesive object).
