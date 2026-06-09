---
name: refactoring
description: Use when refactoring code, identifying refactor candidates, or improving design after tests are green.
---

# Refactoring

- **Duplication** → Extract function/class
- **Long methods / mixed abstraction** → Break into private helpers; see [levels-of-abstraction](../levels-of-abstraction/SKILL.md) for the smells (keep tests on public interface)
- **Shallow modules** → Combine or deepen
- **Feature envy** → Move logic to where data lives
- **Primitive obsession** → Introduce value objects
- **Existing code** the new code reveals as problematic
