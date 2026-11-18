---
name: ship-checklist
description: Checklist for a change before it ships, covering correctness, performance, responsiveness, proof, design, cleanup, and invented requirements. Use before opening a pull request or merging to main, or when asked for the ship checklist or whether a change is ready.
---

# Ship Checklist

Go through each item before opening a pull request or merging to main. Each item is a general default: project guidance and instructions given in the session override it.

1. Correctness: no parts that behave slightly differently, no known edge cases left unhandled. Fix the root cause, without hacks or workarounds, the same way the rest of the codebase does it.
2. Performance: extremely performant, and tested for performance. Resource efficient, with no wasted memory, CPU, or time, and no useless requests.
3. Responsiveness: it feels instant to the user.
4. Proof: tested on the platform where it runs.
5. Design: modules are deep, and public interfaces are as small as possible.
6. Clean: no dead code, and no obvious comments explaining code.
7. Nothing invented: every requirement, number, rule, and behaviour in the change traces back to the request, the session, or the project's rules. Remove what nobody asked for.
