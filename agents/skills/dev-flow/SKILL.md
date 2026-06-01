---
name: dev-flow
description: My end-to-end development flow for any change. Use when fixing a bug, building a feature, or shipping any code change from understanding through production verification.
---

# General Dev Flow

The flow for every change. Follow in order. Don't skip steps.

Understand the kind of task this is. Generate a list of tasks like this one tailored specifically for that task, but maintain the idea of each step:

1. Observe and catalog the current state of the "world" around this. Examples:
 - bug: reproduce and see it happening, find logs confirming it
 - features: interact with the product reasonably and determine what "isn't there"
 - other: <determine this>
2. determine the final state you want to reach
3. make a plan to reach that state
4. execute the plan.
5. verify you reached that state
  - if not reached, consider small changes to reach it or rollback to step 2 with learnings
6. Verify the local build. this should catch only minor issues that don't overthrow the plan.
7. Commit.
8. Push.
9. Verify the CI build.
10. Verify the deployment in prod.
