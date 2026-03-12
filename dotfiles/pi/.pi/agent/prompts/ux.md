---
description: Evaluate and improve web UI usability — heuristics, accessibility, emotional UX, dogfooding audits, onboarding
---

# UX

Evaluate and improve the usability of a web interface. Apply Nielsen's heuristics, enforce WCAG AA accessibility, assess emotional friction (trust, anxiety, cognitive load), and audit UX by dogfooding. For visual design, typography, color, motion, and interaction states, use `/frontend` instead.

$ARGUMENTS

## Nielsen's 10 Heuristics — Code Review Checklist

Apply when reviewing any UI code. Each heuristic maps to concrete implementation checks.

| # | Heuristic | What to check in code |
|---|-----------|----------------------|
| 1 | **Visibility of system status** | Loading indicators on async ops, progress bars for multi-step flows, save confirmations, optimistic UI with rollback |
| 2 | **Match real world** | Labels use user language not dev jargon, dates/currency in locale format, icons match real-world metaphors |
| 3 | **User control & freedom** | Undo for destructive actions, back button works, escape closes modals, cancel preserves prior state |
| 4 | **Consistency & standards** | Same action = same pattern everywhere, follows platform conventions (link underlines, button shapes) |
| 5 | **Error prevention** | Confirmation before destructive actions, disable double-submit, constrain inputs (type=email, min/max), inline validation on blur |
| 6 | **Recognition over recall** | Visible labels not just placeholders, recent/suggested items, breadcrumbs, current state always visible |
| 7 | **Flexibility & efficiency** | Keyboard shortcuts for power users, bulk actions, defaults that fit common case, autofill support |
| 8 | **Aesthetic & minimalist design** | No redundant info, progressive disclosure for advanced options, clear visual hierarchy |
| 9 | **Help users recover from errors** | Errors state what happened + why + how to fix, form state preserved after validation failure, retry available |
| 10 | **Help & documentation** | Tooltips for complex fields, contextual help links, empty states that teach the interface |

## Accessibility — WCAG 2.1 AA Essentials

Non-negotiable. Enforce in code review.

### Semantic HTML
- `<button>` for actions, `<a>` for navigation — never `<div>`/`<span>` with click handlers
- Heading hierarchy h1→h2→h3, no skipping levels
- Landmarks: `<header>`, `<nav>`, `<main>`, `<aside>`, `<footer>`
- Lists: `<ul>`/`<ol>` for groups, not divs
- Tables: `<th scope="col|row">`, `<caption>` for data tables

### ARIA — Use Sparingly
- Prefer native HTML over ARIA (`<button>` beats `<div role="button">`)
- `aria-label` for icon-only buttons
- `aria-describedby` to connect errors to inputs
- `aria-live="polite"` for dynamic content (toasts, notifications)
- `aria-expanded` on toggles, `aria-current="page"` on active nav
- `aria-hidden="true"` on decorative icons alongside text

### Keyboard
- All interactive elements reachable via Tab
- Enter/Space activates buttons, Enter activates links
- Escape closes modals/popovers
- Arrow keys navigate within widgets (tabs, menus, listboxes)
- Focus trap inside modals (use `inert` on background content)
- Visible focus indicators (never `outline: none` without `:focus-visible` replacement)
- Logical tab order matching visual order, no positive tabindex

### Visual
- Text contrast ≥ 4.5:1, large text ≥ 3:1, UI components ≥ 3:1
- Never color alone to convey meaning — add icons, patterns, or text
- Touch targets ≥ 44×44px
- Text resizable to 200% without loss of content
- Respect `prefers-reduced-motion`, `prefers-color-scheme`, `prefers-contrast`

### Forms
- Every input has a visible `<label>` (placeholders are not labels)
- Required fields marked with text, not just asterisk color
- Group related fields with `<fieldset>` + `<legend>`
- Errors below field, connected via `aria-describedby`
- Appropriate input types: `email`, `tel`, `url`, `number`, `date`

## Emotional UX — Trust, Anxiety, Cognitive Load

Beyond "does it work?" — evaluate "how does it feel?"

### Trust Signals
- Confirm before destructive actions with specific language ("Delete 3 items permanently?")
- Show saved/unsaved state explicitly
- Undo for reversible actions
- Preview consequences before commit ("This will email 50 people")
- No surprising side effects from simple actions

### Anxiety Reduction
- Autosave on long forms or warn before navigation away
- Specific button labels ("Save draft" not "Submit")
- Destructive actions visually distinct from safe actions (red, separated)
- Activity log or confirmation so users can verify what happened
- Escape route from every modal and multi-step flow

### Cognitive Load
- One primary action per screen — two primary actions = zero
- Progressive disclosure: basic first, advanced behind expandable sections
- Group related options (Hick's Law: >5–7 ungrouped choices = decision paralysis)
- Related actions close together (Fitts's Law: time = distance / size)
- Front-load important content (F-pattern: 79% scan, 16% read)

## UX Audit — Dogfooding Methodology

When evaluating a running application, follow this sequence.

### Step 1: Adopt a Persona
Who is the user? What's their task? What device? How tech-comfortable?

Default: "First-time user, moderate tech comfort, slightly distracted, wants to finish quickly."

### Step 2: Walk Through with Fresh Eyes
Navigate from entry point. Attempt the task with no prior knowledge. Every hesitation is a finding.

### Step 3: Evaluate Each Screen
- **Clarity**: Is the next step obvious without thinking?
- **Trust**: Do I feel confident about what will happen if I click?
- **Efficiency**: How many clicks/decisions to get here? Dead ends?
- **Recovery**: If I make a mistake, can I get back?

### Step 4: Track the Cost
- Click count from start to task completion
- Decision points (stopped to think)
- Dead ends (wrong path, backtracked)
- Redundant steps (re-entering info, confirming the obvious)

### Step 5: Test Resilience

| Scenario | Expected behavior |
|----------|------------------|
| Navigate away mid-form | Data preserved or clear warning |
| Submit with bad data | Specific errors on correct fields, state preserved |
| Hit back button | Sensible navigation, not broken state |
| Refresh page | State survives (filters, scroll, form data) |
| Double-click submit | No duplicate submission |
| Slow/no network | Graceful degradation, not white screen |

### Step 6: The Big Questions
1. Would I come back? Or look for an alternative?
2. Could I teach someone this in 2 minutes?
3. What one thing would make this twice as easy?
4. Where did I hesitate?

### Severity

| Level | Definition | Example |
|-------|-----------|---------|
| **Critical** | Blocks task completion | Submit does nothing, data lost |
| **High** | Causes confusion or wrong path | Unclear label, no undo on delete |
| **Medium** | Extra effort but workable | Required field not marked |
| **Low** | Polish | Inconsistent capitalization |

## Onboarding Patterns

### Principles
- First 30 seconds determine whether users stay — invest disproportionately
- Users learn by doing, not by reading
- Every screen between signup and the aha moment is a potential drop-off
- Design onboarding as core product, not a bolt-on

### Anti-Patterns
- **Carousels/swipe intros**: Users skip them — if UI needs explaining, simplify the UI
- **Tooltip tours**: Overload before context — teach in context of action instead
- **Feature showcases at launch**: No context for feature value — show value first
- **Explanation screens**: Reading ≠ understanding — let users do the thing

### What Works
- Minimize time-to-first-meaningful-action
- Pre-fill sensible defaults to reduce blank-slate paralysis
- Progressive disclosure: start with simplest possible flow
- Empty states that teach ("No projects yet → Create your first project")
- Celebrate the first completion (the aha moment)

## Quick Decision References

**Fitts's Law** — Make primary actions large and close to where the user already is. Bottom of screen > top corners on mobile (thumb zone).

**Hick's Law** — Decision time grows with option count. Group options. Progressive disclosure. ≤5–7 before grouping.

**Jakob's Law** — Users spend most time on OTHER sites. Follow conventions for core patterns (nav, forms, checkout) unless you have strong evidence to break them.

**Left-Side Bias** — Users spend 69% more time viewing the left half (NN Group 2024). Left-align navigation and key content.
