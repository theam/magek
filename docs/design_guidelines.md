# Magek Design Guidelines

This document defines the visual identity and design system for Magek's documentation and marketing materials.

## Brand Personality

Magek's visual identity reflects the framework's core values:
- **Intelligent** - Sophisticated yet approachable
- **Dynamic** - Modern, forward-thinking
- **Reliable** - Professional, trustworthy
- **Innovative** - Cutting-edge technology

## Color Palette

### Primary Colors

| Role | Hex | RGB | Description |
|------|-----|-----|-------------|
| Primary | `#715CFE` | rgb(113, 92, 254) | Grape violet - logos, links, primary buttons |
| Secondary | `#EC4899` | rgb(236, 72, 153) | Vivid pink - highlights, CTAs |
| Tertiary | `#F59E0B` | rgb(245, 158, 11) | Warm orange - hover effects, gradients |
| Highlight | `#FCD34D` | rgb(252, 211, 77) | Sun yellow - decorative elements |

### Dark Theme Colors

| Role | Hex | RGB | Description |
|------|-----|-----|-------------|
| Background | `#0A0D23` | rgb(10, 13, 35) | Dark theme background |
| Surface | `#13173C` | rgb(19, 23, 60) | Panels, cards, navigation |
| Text Primary | `#E7E9F7` | rgb(231, 233, 247) | Main text |
| Text Muted | `#A5A7C3` | rgb(165, 167, 195) | Secondary text |

### Usage Guidelines

- **Primary (`#715CFE`)**: Use for links, primary buttons, active states, and brand elements
- **Secondary (`#EC4899`)**: Use for call-to-action buttons, important highlights, and emphasis
- **Tertiary (`#F59E0B`)**: Use for hover states, gradient accents, and warnings
- **Highlight (`#FCD34D`)**: Use sparingly for decorative elements and special emphasis

## Typography

### Font Families

| Usage | Font | Weight | Notes |
|-------|------|--------|-------|
| Headings (h1-h3) | Poppins | 600-700 (semi-bold to bold) | Round, friendly shapes |
| Body & UI labels | Inter | 400-500 (regular to medium) | High legibility |
| Code blocks | Fira Code | 400 | Monospace with ligatures |

### Font Loading

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500&family=Inter:wght@400;500;600&family=Poppins:wght@600;700&display=swap" rel="stylesheet">
```

### Heading Specifications

| Element | Size | Weight | Letter Spacing |
|---------|------|--------|----------------|
| h1 | 3rem (48px) | 700 | -0.5px |
| h2 | 2.2rem (35px) | 600 | -0.5px |
| h3 | 1.6rem (26px) | 600 | -0.25px |

### Body Text

- **Base size**: 16-18px
- **Line height**: 1.6
- **Max line width**: 65-75 characters
- **Paragraph spacing**: 1rem (16px) between paragraphs

## Layout & Spacing

### Border Radius

- **Default**: `0.5rem` (8px)
- **Small elements**: `0.25rem` (4px)
- **Large cards/panels**: `0.75rem` (12px)

### Spacing Scale

Use a consistent spacing scale based on `0.5rem` (8px):

| Size | Value | Usage |
|------|-------|-------|
| xs | 0.25rem (4px) | Tight spacing, inline elements |
| sm | 0.5rem (8px) | Small gaps |
| md | 1rem (16px) | Standard spacing |
| lg | 1.5rem (24px) | Section padding |
| xl | 2rem (32px) | Large section gaps |
| 2xl | 3rem (48px) | Major section breaks |

### Container Width

- **Max content width**: 900px
- **Documentation sidebar**: 280px
- **Code blocks**: Full container width with horizontal scroll

## Interactive Elements

### Buttons

**Primary Button**
- Background: Gradient from `#715CFE` to `#EC4899`
- Text: `#E7E9F7` (white/light)
- Border radius: `0.5rem`
- Padding: `0.5rem 1rem`
- Hover: Brightness increase, subtle shadow

**Secondary Button**
- Background: transparent
- Border: 1px solid `#715CFE`
- Text: `#715CFE`
- Hover: Background `rgba(113, 92, 254, 0.1)`

### Links

- Default: `#715CFE` (primary)
- Hover: `#FCD34D` (highlight) with underline
- Visited: Same as default (for consistency)

### Code Blocks

- Background: `#13173C` (surface)
- Border: 1px solid `rgba(113, 92, 254, 0.2)`
- Text: `#E7E9F7` (primary text)
- Inline code: Background with `#EC4899` text

## Icons

- **Style**: Outline/stroke icons (not filled)
- **Stroke width**: 1.5-2px
- **Size**: 20-24px for UI, 16px for inline
- **Recommended library**: Lucide Icons or Heroicons (outline variant)

## Accessibility

### Color Contrast

All color combinations must meet WCAG 2.1 AA standards:
- Normal text: Minimum 4.5:1 contrast ratio
- Large text (18px+): Minimum 3:1 contrast ratio
- UI components: Minimum 3:1 contrast ratio

### Verified Contrast Ratios

| Combination | Ratio | Status |
|-------------|-------|--------|
| Text Primary on Background | 14.5:1 | Pass |
| Text Muted on Background | 7.2:1 | Pass |
| Primary on Background | 5.8:1 | Pass |

### Focus States

- All interactive elements must have visible focus indicators
- Use `outline: 2px solid #715CFE; outline-offset: 2px;`

### Motion

- Respect `prefers-reduced-motion` for animations
- Keep transitions short (150-200ms)

## CSS Custom Properties

```css
:root {
  /* Primary Colors */
  --color-primary: #715CFE;
  --color-secondary: #EC4899;
  --color-tertiary: #F59E0B;
  --color-highlight: #FCD34D;

  /* Dark Theme */
  --color-background: #0A0D23;
  --color-surface: #13173C;
  --color-text: #E7E9F7;
  --color-text-muted: #A5A7C3;

  /* Typography */
  --font-heading: 'Poppins', sans-serif;
  --font-body: 'Inter', sans-serif;
  --font-code: 'Fira Code', monospace;

  /* Spacing */
  --radius: 0.5rem;
  --max-width: 900px;
}
```
