---
name: reproducible-locally
description: >
  Use when proving a deployed or built change actually works, verifying a
  feature locally with no manual step, or deciding how to prove this specific
  change works. Triggers on "prove it works", "verify the feature",
  "reproducible locally", "no manual step", "deploy-verify".
---

# Reproducible Locally

A change is done only when the feature it shipped is proven to work locally with
no human step. Hold to the *no-manual-APK principle*.

## The no-manual-APK principle

"no-manual-APK" means: do not rely on a human tapping through an APK build,
clicking a cloud dashboard, or eyeballing a staging URL to confirm the change.
Prove it with something that runs locally and fails loudly on failure: a run, a
throwaway probe, or a test. If confirming the feature needs a human, it is not
proof.

## Prove the feature, not the deploy

A green build or a service that is "up" says the pipeline ran, not that the
feature works. Exercise THIS change's actual behaviour and assert on its real
output. Two outcomes, name which one you reached:

- **verified** — proof ran locally, the feature works.
- **unverifiable** — you cannot prove it locally with no human step. Do NOT
  silently pass. Report a loose end that states WHY it is unverifiable and
  PROPOSES how to make it verifiable in future. Keep it to report + propose; an
  orchestrator routes the loose end its own way.

## Choose the verification per feature

Devise how to prove THIS specific change each time; there is no standing recipe.
Prefer, in order, dropping down only when the one above is impossible:

1. Run the real thing.
2. Write a throwaway probe.
3. Execute build/tests.
4. Read the exact source `file:line`.
5. Cite docs.

Higher beats lower.

## Standalone

Any deploy/verify workflow uses this, orchestrator or not. It carries no
orchestrator or bridge specifics; an orchestrator composes it and routes the
reported loose ends however it wants.
