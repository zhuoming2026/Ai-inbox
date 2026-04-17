---
name: "impeccable"
description: "Enhanced frontend design skill that eliminates AI-generated aesthetic slop. Invoke when creating UI components, designing layouts, or styling web applications."
---

# Impeccable Design Language

**Anti-AI-Slop Design System for AI Coding Assistants**

Impeccable transforms generic, templated AI outputs into distinctive, professional-grade interfaces by enforcing strict design principles that eliminate common "AI aesthetic" anti-patterns.

---

## Core Philosophy

**Style is not decoration. It is a contract of expectations between the tool and the user.**

AI coding assistants tend to generate visually similar UIs because they follow common patterns. Impeccable breaks this cycle by teaching AI to recognize and avoid generic aesthetics while embracing intentional, distinctive design choices.

---

## Typography Guidelines

### ✅ DO: Use Distinctive Font Combinations

```css
/* Good: Distinctive display + refined body font pairing */
:root {
  --font-display: 'Playfair Display', Georgia, serif;
  --font-body: 'Source Sans Pro', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
}
```

### ❌ DON'T: Use Generic System Fonts

**Avoid at all costs:**
- `Inter` (overused in AI-generated UIs)
- `Roboto`
- `Arial`
- `system-ui` alone
- Any font without personality

**Exception:** `system-ui` may be used as a fallback, but never as the primary font.

### Typography Scale Best Practices

```css
/* Good: Deliberate scale with clear hierarchy */
--text-xs: 0.75rem;    /* 12px - captions */
--text-sm: 0.875rem;   /* 14px - secondary */
--text-base: 1rem;     /* 16px - body */
--text-lg: 1.125rem;   /* 18px - lead */
--text-xl: 1.25rem;    /* 20px - subheadings */
--text-2xl: 1.5rem;    /* 24px - section titles */
--text-3xl: 2rem;      /* 32px - page titles */
--text-4xl: 3rem;      /* 48px - hero headlines */
```

---

## Color System

### ✅ DO: Create Cohesive Palettes

```css
:root {
  /* Good: Dominant base with sharp accent */
  --color-bg: #faf9f6;           /* Warm off-white */
  --color-surface: #ffffff;       /* Cards, modals */
  --color-text: #1a1a1a;          /* Not pure black */
  --color-text-muted: #666666;
  --color-primary: #fabb18;        /* Sharp yellow accent */
  --color-primary-hover: #f9c84a;

  /* Dark theme */
  --color-bg-dark: #0f0f0f;        /* Not pure black */
  --color-surface-dark: #1a1a1a;
  --color-text-dark: #f5f5f5;      /* Not pure white */
}
```

### ❌ DON'T: Use the "AI Palette"

**Red flags to avoid:**

| Anti-pattern | Why it's bad | Fix |
|--------------|--------------|-----|
| Cyan on dark backgrounds | Overused AI aesthetic | Use a unique accent color |
| Purple-to-blue gradients | Clichéd and generic | Use solid colors or subtle gradients |
| Neon accents on dark | "Cyberpunk" cliché | Use muted, sophisticated accents |
| Gray text on colored backgrounds | Washed out, inaccessible | Use darker shade of background |
| Pure `#000` or `#fff` | Harsh, lacks sophistication | Use near-black (`#1a1a1a`) or off-white (`#faf9f6`) |

### Color Contrast Rules

```css
/* Good: Proper contrast ratios */
/* Text on light: #1a1a1a on #faf9f6 = ~17:1 ratio ✓ */
/* Text on dark: #f5f5f5 on #0f0f0f = ~17:1 ratio ✓ */

/* Bad: Insufficient contrast */
/* #888888 on #ffffff = ~4.5:1 ratio ✗ */
```

---

## Layout & Spacing

### ✅ DO: Use Consistent Spacing Tokens

```css
:root {
  --space-1: 0.25rem;   /* 4px */
  --space-2: 0.5rem;    /* 8px */
  --space-3: 0.75rem;   /* 12px */
  --space-4: 1rem;      /* 16px */
  --space-6: 1.5rem;    /* 24px */
  --space-8: 2rem;      /* 32px */
  --space-12: 3rem;     /* 48px */
  --space-16: 4rem;     /* 64px */
}
```

### ❌ DON'T: Use Random Spacing Values

**Anti-pattern:**
```css
/* Bad: Magic numbers everywhere */
.card { padding: 23px; margin: 17px; }
.button { padding: 13px 27px; }
```

**Good:**
```css
/* Good: Consistent spacing system */
.card { padding: var(--space-6); margin-bottom: var(--space-4); }
.button { padding: var(--space-3) var(--space-6); }
```

---

## Component Design

### Cards

```css
/* Good: Refined card with subtle depth */
.card {
  background: var(--color-surface);
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
  padding: var(--space-6);
  transition: transform 0.2s, box-shadow 0.2s;
}

.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.08);
}
```

### Buttons

```css
/* Good: Distinctive button style */
.btn-primary {
  background: var(--color-primary);
  color: #1a1a1a;  /* Dark on light for contrast */
  border-radius: 9999px;  /* Pill shape */
  padding: var(--space-3) var(--space-8);
  font-weight: 600;
  transition: all 0.2s;
}

.btn-primary:hover {
  background: var(--color-primary-hover);
  transform: scale(1.02);
}
```

### ❌ DON'T: Template Decorations

**Red flag:** Don't place large rounded icons above every heading.

```html
<!-- Bad: Template-like structure -->
<div>
  <div class="icon-circle"><Icon /></div>
  <h2>Section Title</h2>
</div>

<!-- Good: Integrated, purposeful design -->
<h2>
  <Icon inline />
  Section Title
</h2>
```

---

## Motion & Animation

### ✅ DO: Purposeful Micro-interactions

```css
/* Good: Subtle, meaningful animations */
.button {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.button:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.card {
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}
```

### ❌ DON'T: Over-animate or Use Generic Effects

**Avoid:**
- `animation: pulse 2s infinite` on loading states
- `transform: rotate(360deg)` for spinners
- Bouncing or elastic effects on serious UIs
- Transitions faster than 150ms (too jarring)
- Transitions slower than 400ms (feels sluggish)

### Animation Best Practices

```css
/* Good: CSS-only animations where possible */
@media (prefers-reduced-motion: reduce) {
  * {
    animation: none !important;
    transition: none !important;
  }
}
```

---

## Dark Mode

### ✅ DO: Use Sophisticated Dark Colors

```css
[data-theme="dark"] {
  --color-bg: #0f0f0f;          /* Near-black, not pure black */
  --color-surface: #1a1a1a;     /* Elevated surfaces */
  --color-text: #f5f5f5;        /* Off-white, not pure white */
  --color-text-muted: #888888;

  /* Adjust accent for dark mode if needed */
  --color-primary: #fabb18;
  --color-primary-hover: #f9c84a;
}
```

### ❌ DON'T: Use Pure Black or White

```css
/* Bad */
body { background: #000000; }
.text { color: #ffffff; }

/* Good */
body { background: #0f0f0f; }
.text { color: #f5f5f5; }
```

---

## Border Radius

### Consistent Radius Scale

```css
:root {
  --radius-sm: 4px;      /* Small elements */
  --radius-md: 12px;      /* Cards, inputs */
  --radius-lg: 16px;      /* Modals */
  --radius-xl: 24px;     /* Large containers */
  --radius-full: 9999px;  /* Pills, circular */
}
```

### Don't Mix Radius Styles

```css
/* Bad: Inconsistent border-radius */
.card { border-radius: 16px; }
.button { border-radius: 8px; }
.modal { border-radius: 4px; }

/* Good: Consistent system */
.card { border-radius: var(--radius-md); }
.button { border-radius: var(--radius-full); }
.modal { border-radius: var(--radius-lg); }
```

---

## Shadows

### Sophisticated Shadow System

```css
:root {
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.04);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 8px 30px rgba(0, 0, 0, 0.08);
  --shadow-xl: 0 20px 50px rgba(0, 0, 0, 0.12);
}
```

---

## Common Anti-patterns to Avoid

### 1. ❌ Template Headers

```html
<!-- Bad: Generic hero section -->
<div class="hero">
  <h1>Welcome to Our Product</h1>
  <p>The best solution for your needs</p>
  <button>Get Started</button>
</div>

<!-- Good: Unique, purposeful design -->
<div class="hero">
  <h1>Your AI-Powered <span>Inbox</span></h1>
  <p>Capture thoughts. AI processes. You review.</p>
  <button class="btn-primary">Start Capturing</button>
</div>
```

### 2. ❌ Centered Everything

```css
/* Bad: Over-centered layout */
.container {
  display: flex;
  justify-content: center;
  align-items: center;
}

/* Good: Intentional alignment */
.nav { justify-content: space-between; }
.card-grid { justify-content: flex-start; }
.hero { text-align: left; }
```

### 3. ❌ Icon Overload

```html
<!-- Bad: Icon above every section -->
<section>
  <IconLarge />
  <h2>Feature 1</h2>
</section>

<!-- Good: Inline or purposeful icons -->
<h2>
  <Icon inline />
  Feature Name
</h2>
```

### 4. ❌ Gradient Overload

```css
/* Bad: Purple-blue gradients everywhere */
.hero { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
.button { background: linear-gradient(90deg, #00d4ff, #7c3aed); }

/* Good: Solid, intentional colors */
.hero { background: var(--color-surface); }
.button { background: var(--color-primary); }
```

---

## Application Checklist

Before completing any UI implementation, verify:

- [ ] **Typography**: Using distinctive font pairing, not Inter/Roboto
- [ ] **Colors**: Cohesive palette with sharp accents, no AI palette
- [ ] **Spacing**: Consistent spacing tokens, no magic numbers
- [ ] **Shadows**: Sophisticated shadow system, not harsh drop shadows
- [ ] **Radius**: Consistent border-radius scale
- [ ] **Motion**: Purposeful micro-interactions, no over-animation
- [ ] **Dark mode**: Uses sophisticated near-black/white, not pure
- [ ] **No template patterns**: No generic hero sections or icon overloads

---

## Resources

- **Design Language**: https://pyshine.com/Impeccable-Design-Language-for-AI/
- **Official Skill**: https://www.claudepluginhub.com/plugins/pbakaus-impeccable
- **GitHub**: https://github.com/anthropics/claude-code/tree/main/plugins/frontend-design

---

## Usage

Invoke this skill when:
- Creating new UI components
- Styling existing components
- Designing page layouts
- Implementing dark/light themes
- Adding animations or transitions
- Reviewing code for aesthetic quality

**Command:** `impeccable` or automatically triggered by design-related requests.
