---
name: reproducible-locally
description: >
  Use when proving a deployed or built change actually works, verifying a
  feature locally with no manual step, or deciding how to prove this specific
  change works. Triggers on "prove it works", "verify the feature",
  "reproducible locally", "no manual step", "deploy-verify".
---

# Reproducible Locally

A change is done when its changed behaviour has repeatable, automated evidence.
Run the proof from the local workflow when possible; target the environment
where the behaviour exists when necessary.

## Automated proof

Do not treat tapping through a build, clicking a dashboard, or eyeballing a URL
as release evidence for known behaviour. Exercise the changed behaviour and
assert an observable postcondition: a response, persisted state, emitted event,
metric, or other externally visible effect.

A successful build proves the build succeeded. A successful behavioural check
proves the scenario and assertion it exercised.

Report one outcome:

- **verified**: state the scenario, command or probe, assertion, and result.
- **not verified**: state what prevented automated proof and the smallest
  change that would make it possible.

## Choose the verification per feature

Devise how to prove this specific change each time; there is no standing recipe.
