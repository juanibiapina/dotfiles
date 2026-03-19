---
description: Perform comprehensive audit of interface quality across accessibility, performance, theming, and responsive design. Generates detailed report of issues with severity ratings and recommendations.
---

Run systematic quality checks and generate a comprehensive audit report with prioritized issues and actionable recommendations. Don't fix issues — document them for other commands to address. Use the frontend-design skill for anti-pattern detection.

$ARGUMENTS

## Diagnostic Dimensions

1. **Accessibility** — Contrast ratios, missing ARIA, keyboard navigation, semantic HTML, alt text, form labels.
2. **Performance** — Layout thrashing, expensive animations (layout properties instead of transform/opacity), missing lazy loading, bundle size, unnecessary re-renders.
3. **Theming** — Hard-coded colors not using design tokens, broken dark mode, inconsistent token usage.
4. **Responsive Design** — Fixed widths that break on mobile, touch targets < 44x44px, horizontal scroll, text scaling issues.
5. **Anti-Patterns** — Check against ALL the DON'T guidelines in the frontend-design skill. Look for AI slop tells: AI color palette, gradient text, glassmorphism, hero metrics, card grids, generic fonts.

## Report Structure

### Anti-Patterns Verdict
Pass/fail: Does this look AI-generated? List specific tells. Be direct.

### Executive Summary
Total issues by severity, top 3-5 critical issues, recommended next steps.

### Detailed Findings

For each issue: location (file, line), severity (Critical/High/Medium/Low), category, description, impact, which standard it violates, how to fix it, and which `/impeccable:*` command to use.

Group by severity: Critical (blocks functionality, WCAG A violations) → High (significant impact, WCAG AA) → Medium (quality/performance) → Low (minor inconsistencies).

### Patterns & Systemic Issues
Recurring problems across the codebase (e.g., "hard-coded colors in 15+ components").

### Positive Findings
What's working well — good practices to maintain.

### Recommendations by Priority
Immediate → Short-term → Medium-term → Long-term, mapped to `/impeccable:*` commands.

## Constraints

- This is an audit, not a fix. Document thoroughly.
- Be specific about impact — explain why each issue matters.
- Don't report false positives without verification.
- Don't invent severity — if everything is critical, nothing is.
- Include positive findings — celebrate what works.
