---
description: Collaborative design exploration before coding. Explore intent, propose approaches, validate design, write spec.
---

# Brainstorming Ideas Into Designs

Help turn ideas into fully formed designs and specs through natural collaborative dialogue.

Start by understanding the current project context, then ask questions one at a time to refine the idea. Once you understand what you're building, present the design and get user approval.

## Topic

$ARGUMENTS

## Hard Gate

Do NOT write any code, scaffold any project, or take any implementation action until you have presented a design and the user has approved it. This applies to EVERY project regardless of perceived simplicity.

**Anti-pattern: "This is too simple to need a design."** Every project goes through this process. A todo list, a single-function utility, a config change, all of them. "Simple" projects are where unexamined assumptions cause the most wasted work. The design can be short (a few sentences for truly simple projects), but you MUST present it and get approval.

## Checklist

Complete these in order:

1. **Explore project context**: check files, docs, recent commits
2. **Ask clarifying questions**: one at a time, understand purpose/constraints/success criteria
3. **Propose 2-3 approaches**: with trade-offs and your recommendation
4. **Present design**: in sections scaled to their complexity, get user approval after each section
5. **Write design doc**: save to `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md` and commit (user preferences for location override this default)
6. **User reviews written spec**: ask user to review the spec file before proceeding
7. **Transition to planning**: invoke `/superpowers:write-plan` to create implementation plan

## The Process

### Understanding the Idea

- Check out the current project state first (files, docs, recent commits)
- Before asking detailed questions, assess scope: if the request describes multiple independent subsystems, flag this immediately. Don't spend questions refining details of a project that needs to be decomposed first.
- If the project is too large for a single spec, help the user decompose into sub-projects: what are the independent pieces, how do they relate, what order should they be built? Then brainstorm the first sub-project through the normal design flow. Each sub-project gets its own spec → plan → implementation cycle.
- For appropriately-scoped projects, ask questions one at a time to refine the idea
- Prefer multiple choice questions when possible, but open-ended is fine too
- Only one question per message. If a topic needs more exploration, break it into multiple questions.
- Focus on understanding: purpose, constraints, success criteria

### Exploring Approaches

- Propose 2-3 different approaches with trade-offs
- Present options conversationally with your recommendation and reasoning
- Lead with your recommended option and explain why

### Presenting the Design

- Once you believe you understand what you're building, present the design
- Scale each section to its complexity: a few sentences if straightforward, up to 200-300 words if nuanced
- Ask after each section whether it looks right so far
- Cover: architecture, components, data flow, error handling, testing
- Be ready to go back and clarify if something doesn't make sense

### Design for Isolation and Clarity

- Break the system into smaller units that each have one clear purpose, communicate through well-defined interfaces, and can be understood and tested independently
- For each unit, you should be able to answer: what does it do, how do you use it, and what does it depend on?
- Can someone understand what a unit does without reading its internals? Can you change the internals without breaking consumers? If not, the boundaries need work.
- Smaller, well-bounded units are easier to work with. You reason better about code you can hold in context at once.

### Working in Existing Codebases

- Explore the current structure before proposing changes. Follow existing patterns.
- Where existing code has problems that affect the work (e.g., a file that's grown too large, unclear boundaries), include targeted improvements as part of the design.
- Don't propose unrelated refactoring. Stay focused on what serves the current goal.

## After the Design

### Write the Spec

- Write the validated design to `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md`
- User preferences for spec location override this default
- Commit the design document to git

### User Review Gate

After writing the spec, ask the user to review it:

> "Spec written and committed to `<path>`. Please review it and let me know if you want to make any changes before we start writing out the implementation plan."

Wait for the user's response. If they request changes, make them and re-run the spec review loop. Only proceed once the user approves.

### Transition to Planning

Invoke `/superpowers:write-plan` to create a detailed implementation plan. Do NOT invoke any other template. write-plan is the next step.

## Key Principles

- **One question at a time.** Don't overwhelm with multiple questions.
- **Multiple choice preferred.** Easier to answer than open-ended when possible.
- **YAGNI ruthlessly.** Remove unnecessary features from all designs.
- **Explore alternatives.** Always propose 2-3 approaches before settling.
- **Incremental validation.** Present design, get approval before moving on.
- **Be flexible.** Go back and clarify when something doesn't make sense.
