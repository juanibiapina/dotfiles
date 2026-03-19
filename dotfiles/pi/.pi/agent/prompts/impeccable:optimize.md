---
description: Improve interface performance across loading speed, rendering, animations, images, and bundle size. Makes experiences faster and smoother.
---

Identify and fix performance issues to create faster, smoother user experiences. Measure before and after — don't optimize without data.

$ARGUMENTS

## Assess

Measure current state: Core Web Vitals (LCP, INP, CLS), load time, bundle size, runtime performance (frame rate, memory), network (request count, payload sizes). Identify what's actually slow and who's affected.

## Optimization Areas

### Loading
- **Images**: Modern formats (WebP, AVIF), proper sizing with `srcset`, lazy loading below the fold, 80-85% quality compression
- **JavaScript**: Code splitting (route-based, component-based), tree shaking, lazy load non-critical code with dynamic imports
- **CSS**: Remove unused CSS, inline critical CSS, minimize
- **Fonts**: `font-display: swap`, subset to needed characters, preload critical fonts, limit weights
- **Strategy**: Preload critical assets, prefetch likely next pages, use CDN, enable HTTP/2+

### Rendering
- Batch DOM reads then writes (avoid layout thrashing)
- Use `content-visibility: auto` for long content, virtual scrolling for large lists
- Minimize DOM depth and size
- Use CSS `contain` for independent regions

### Animation
- Only animate `transform` and `opacity` (GPU-accelerated)
- Target 16ms per frame (60fps), use `requestAnimationFrame` for JS animations
- Debounce/throttle scroll handlers

### Core Web Vitals

| Metric | Target | Key Fixes |
|--------|--------|-----------|
| LCP | < 2.5s | Optimize hero images, inline critical CSS, preload, SSR |
| INP | < 200ms | Break up long tasks, defer non-critical JS, use web workers |
| CLS | < 0.1 | Set dimensions on images/videos, use `aspect-ratio`, don't inject content above existing content |

### React/Framework
Memoize expensive components and computations. Virtualize long lists. Code split routes. Minimize re-renders.

## Constraints

- Measure on real devices with real network conditions — desktop Chrome on fast wifi isn't representative
- Don't sacrifice accessibility for performance
- Don't lazy load above-fold content
- Don't optimize micro-issues while ignoring major bottlenecks
- Use `will-change` sparingly — it creates layers and uses memory
