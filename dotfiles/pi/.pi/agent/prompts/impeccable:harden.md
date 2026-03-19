---
description: Improve interface resilience through better error handling, i18n support, text overflow handling, and edge case management. Makes interfaces robust and production-ready.
---

Strengthen interfaces against edge cases, errors, internationalization issues, and real-world usage that breaks idealized designs.

$ARGUMENTS

## Assess

Test the interface with extreme inputs and scenarios to find weaknesses:

- **Text**: Very long (100+ chars), very short (empty, single char), special characters (emoji, RTL, accents, CJK)
- **Data**: Large numbers, many items (1000+), no data (empty states)
- **Network**: Offline, slow, timeout, API errors (400, 401, 403, 404, 429, 500)
- **Validation**: Required fields, format errors, concurrent operations (double-submit)
- **i18n**: Long translations (German ~30% longer), RTL languages, date/number format differences

## Hardening Dimensions

### Text Overflow
Handle truncation (single-line ellipsis, multi-line clamp), word wrapping, and flex/grid overflow (use `min-width: 0` on flex items). Test at 200% zoom.

### Internationalization
Budget 30-40% extra space for translations. Use CSS logical properties (`margin-inline-start`, not `margin-left`) for RTL support. Use `Intl` API for date/number/currency formatting. Use proper i18n libraries for pluralization.

### Error Handling
Show clear messages with recovery paths for each error type. Preserve form state after validation failure. Handle each HTTP status code appropriately (401 → login, 403 → permission error, 429 → rate limit message). Provide retry buttons for network errors.

### Edge Cases
Empty states with clear next actions. Loading states that explain what's happening. Pagination or virtual scrolling for large datasets. Prevent double-submission (disable button while loading). Permission states with clear explanation.

### Accessibility Resilience
All functionality accessible via keyboard. Screen reader support with proper ARIA and live regions. Respect `prefers-reduced-motion` and `prefers-contrast`. Test in Windows high contrast mode.

### Performance Resilience
Progressive image loading, skeleton screens. Clean up event listeners, cancel subscriptions, abort requests on unmount. Debounce search inputs, throttle scroll handlers.

## Constraints

- Validate on both client and server — never trust client-side only
- Don't assume perfect input — validate everything
- Don't use fixed widths for text containers
- Don't leave error messages generic ("Error occurred") — be specific about what happened and how to fix it
- Don't block the entire interface when one component errors
