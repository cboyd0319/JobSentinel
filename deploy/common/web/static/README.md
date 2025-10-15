# JobSentinel Static Assets - World-Class UI

This directory contains the visual assets and design system for JobSentinel's world-class user interface.

## Directory Structure

```
static/
├── css/
│   └── style.css          # Main stylesheet (45KB, ~8KB gzipped)
├── js/
│   └── app.js             # Interactive enhancements (12KB, ~4KB gzipped)
├── tokens.json            # Design system tokens (4.6KB)
└── README.md              # This file
```

## Quick Start

### Using the Design System

```html
<!-- Include in your HTML -->
<link href="/static/css/style.css" rel="stylesheet">
<script src="/static/js/app.js"></script>
```

### Design Tokens

Access tokens via CSS variables:

```css
/* Colors */
color: var(--primary-600);
background: var(--bg-primary);

/* Spacing */
padding: var(--spacing-4);
margin: var(--spacing-lg);

/* Typography */
font-size: var(--text-xl);
line-height: var(--leading-normal);

/* Shadows */
box-shadow: var(--shadow-md);

/* Motion */
transition: all var(--transition-base);
```

Or import `tokens.json` for programmatic access:

```javascript
import tokens from '/static/tokens.json';

const primaryColor = tokens.color.primary['600'];
const spacing = tokens.spacing['4'];
```

## Features

### Visual Excellence
- ✨ Gradient mesh backgrounds
- 🎯 Magnetic hover effects
- 📜 Scroll-based reveals
- 💫 Micro-interactions
- 🎨 Custom focus rings
- 🌓 Dark mode support

### Performance
- ⚡ GPU-accelerated animations
- 🚀 Lazy loading with Intersection Observer
- 📦 Minimal bundle size
- 🎭 Content-visibility optimization
- 💨 Passive event listeners

### Accessibility
- ♿ WCAG 2.2 AA compliant
- ⌨️ Keyboard navigation
- 🔊 Screen reader support
- 🎬 Motion preference detection
- 👆 Touch targets ≥ 44×44px

## CSS Architecture

### Organization

The CSS is organized into logical sections:

1. **Root Variables** - Design tokens as CSS custom properties
2. **Global Styles** - Base resets and typography
3. **Skip Link** - Accessibility-first navigation
4. **Navigation** - Sticky nav with scroll effects
5. **Alerts** - Notification components
6. **Cards** - Content containers with hover effects
7. **Buttons** - Interactive elements with states
8. **Forms** - Input components and validation
9. **Typography** - Heading hierarchy and text styles
10. **Badges** - Status indicators
11. **Stats** - Data visualization
12. **Empty States** - Zero-data experiences
13. **Loading States** - Skeletons and spinners
14. **Utilities** - Helper classes
15. **World-Class Enhancements** - Advanced visual features
16. **Print Styles** - Optimized for printing

### Naming Convention

We use a hybrid approach:

- **BEM-inspired** for components: `.card`, `.card-header`, `.card-body`
- **Utility classes** for common patterns: `.d-flex`, `.gap-2`, `.text-center`
- **State modifiers** with classes: `.active`, `.disabled`, `.loading`

## JavaScript Features

### Core Functions

```javascript
// Theme toggle
toggleTheme()

// Smooth scroll
smoothScrollTo('#target')

// Show confetti
showConfetti()

// Copy to clipboard
copyToClipboard(text, button)
```

### Auto-Initialized Features

- Navigation active state management
- Form validation and feedback
- Alert auto-dismiss (5 seconds)
- Keyboard accessibility
- Scroll reveal animations
- Sticky navigation transforms
- Magnetic card hover effects
- Parallax layers
- Motion preference detection

### Event Handling

All event listeners use:
- Passive listeners for scroll events
- Event delegation for lists
- Debouncing/throttling where appropriate
- Proper cleanup on unmount

## Design Tokens Reference

### Colors

**Primary (Blue):**
- `50` to `900`: Light to dark shades
- Use `600` for primary actions

**Success (Green):**
- `50` to `900`: Light to dark shades
- Use `600` for positive feedback

**Danger (Red):**
- `50` to `900`: Light to dark shades
- Use `600` for warnings

**Gray Scale:**
- `50` to `900`: Neutral colors
- Use for text, backgrounds, borders

### Spacing Scale

Based on 4px grid:
- `0`: 0
- `1`: 4px
- `2`: 8px
- `3`: 12px
- `4`: 16px (base unit)
- `5`: 20px
- `6`: 24px
- `8`: 32px
- `10`: 40px
- `12`: 48px
- `16`: 64px
- `20`: 80px
- `24`: 96px

### Typography Scale

Perfect Fourth ratio (1.333):
- `xs`: 12px
- `sm`: 14px
- `base`: 16px (body)
- `lg`: 18px
- `xl`: 20px
- `2xl`: 24px
- `3xl`: 30px
- `4xl`: 36px
- `5xl`: 48px

### Shadows

Elevation system:
- `xs`: Minimal lift
- `sm`: Slight elevation
- `md`: Standard cards (default)
- `lg`: Raised elements
- `xl`: Floating elements
- `2xl`: Dramatic elevation
- `inner`: Inset shadow

### Motion

**Durations:**
- `fast`: 150ms (micro-interactions)
- `base`: 200ms (standard transitions)
- `slow`: 300ms (complex animations)
- `slower`: 500ms (page transitions)

**Easing:**
- `ease-out`: UI entering
- `ease-in-out`: Two-way transitions
- `spring`: Playful interactions
- `bounce`: Success feedback

## Browser Support

### Fully Supported
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Opera 76+

### Feature Detection

The system gracefully degrades:
- No `backdrop-filter`? Solid background fallback
- No CSS Grid? Flexbox fallback
- No Intersection Observer? Animations still work
- Motion preference? Respectfully disabled

## Performance Best Practices

### CSS

1. **Use transforms and opacity only** for animations
2. **Add `will-change`** for elements that will animate
3. **Use `contain`** for isolated components
4. **Leverage `content-visibility`** for off-screen content
5. **Minimize repaints** with careful selector usage

### JavaScript

1. **Use Intersection Observer** for scroll effects
2. **Passive event listeners** for scroll/touch
3. **Event delegation** for dynamic lists
4. **Debounce/throttle** expensive operations
5. **Batch DOM reads/writes** to prevent thrashing

### Images

1. **Use WebP** with fallbacks (future)
2. **Lazy load** with `loading="lazy"`
3. **Responsive images** with srcset (future)
4. **Proper sizing** to prevent CLS

## Accessibility Guidelines

### Color Contrast

- Normal text: 4.5:1 minimum
- Large text (18px+): 3:1 minimum
- UI components: 3:1 minimum
- Test with tools: Lighthouse, axe, WAVE

### Focus Indicators

- Always visible (3px outline)
- Brand color (#1a8cff)
- 2px offset for clarity
- Increased in high contrast mode

### Motion

- Detect `prefers-reduced-motion`
- Provide fade-only fallbacks
- Never auto-play animations
- Allow pause/stop controls

### Keyboard

- Logical tab order
- Enter/Space activates buttons
- Escape closes modals
- Arrow keys for navigation
- Skip links for efficiency

## Testing

### Visual Regression

```bash
# Take baseline screenshots
npm run test:visual:baseline

# Compare against baseline
npm run test:visual:compare
```

### Accessibility

```bash
# Run axe audit
npx axe http://localhost:5001

# Run Lighthouse
lighthouse http://localhost:5001 --only-categories=accessibility

# Run Pa11y
npx pa11y http://localhost:5001
```

### Performance

```bash
# Run Lighthouse
lighthouse http://localhost:5001 --only-categories=performance

# Analyze bundle
npm run analyze
```

## Maintenance

### Monthly
- Review accessibility audit results
- Check browser compatibility
- Update design tokens as needed
- Optimize bundle size

### Quarterly
- Conduct user testing sessions
- Review analytics data
- Update documentation
- Plan new enhancements

## Resources

### Documentation
- [Visual Enhancements Guide](../docs/VISUAL_ENHANCEMENTS.md)
- [Accessibility Guide](../docs/ACCESSIBILITY.md)
- [UX Design Specification](../docs/UX_DESIGN_SPECIFICATION.md)

### Design Tools
- [Figma](https://figma.com) - Design mockups
- [Style Dictionary](https://amzn.github.io/style-dictionary) - Token transformation
- [ColorBox](https://colorbox.io/) - Color scale generation

### Testing Tools
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)
- [axe DevTools](https://www.deque.com/axe/devtools/)
- [WAVE](https://wave.webaim.org/)
- [Contrast Checker](https://webaim.org/resources/contrastchecker/)

## Contributing

### Adding New Components

1. Define in design tokens (`tokens.json`)
2. Create CSS classes following naming convention
3. Add JavaScript enhancements if needed
4. Document in `VISUAL_ENHANCEMENTS.md`
5. Test accessibility and performance
6. Submit PR with screenshots

### Modifying Tokens

1. Update `tokens.json`
2. Regenerate CSS variables (manual for now)
3. Test all components
4. Update documentation
5. Run visual regression tests

## Support

Questions or issues? Open a discussion or issue on GitHub.

---

**Built with ❤️ for an exceptional user experience.**
