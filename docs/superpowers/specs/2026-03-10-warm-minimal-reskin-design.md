# Frontend Reskin: Warm Minimal with Ink Indigo

## Overview

Full visual reskin of the Vue 3 frontend from default Tailwind to a "Warm Minimal" aesthetic with an Ink Indigo (`#3d5a80`) accent color. Covers all 6 views, 3 modals, and the app shell.

## Design Tokens

### Colors

| Token | Value | Usage |
|-------|-------|-------|
| `--bg` | `#faf8f5` | Page background |
| `--surface` | `#ffffff` | Cards, modals, form fields |
| `--border` | `#eeeeee` | Card borders, dividers |
| `--border-hover` | `#ddd` | Hovered card borders |
| `--primary` | `#3d5a80` | Buttons, active nav, links |
| `--primary-hover` | `#2c4460` | Hovered primary elements |
| `--primary-light` | `#eef2f7` | Primary tinted backgrounds |
| `--text` | `#2c2c2c` | Headings, primary text |
| `--text-secondary` | `#999999` | Labels, descriptions |
| `--text-muted` | `#bbbbbb` | Timestamps, hints |
| `--success` | `#2e7d32` | Pass status text |
| `--success-bg` | `#e8f5e9` | Pass status background |
| `--danger` | `#c62828` | Fail status text, delete actions |
| `--danger-bg` | `#fbe9e7` | Fail status background |
| `--warning` | `#e65100` | Warning text |
| `--warning-bg` | `#fff3e0` | Warning background |
| `--shadow` | `0 1px 3px rgba(0,0,0,0.04)` | Card shadow |
| `--shadow-hover` | `0 4px 12px rgba(0,0,0,0.06)` | Hovered card shadow |

### Typography

- **Headings:** `'DM Serif Display', serif` — loaded from Google Fonts
- **Body/UI:** `'DM Sans', sans-serif` — loaded from Google Fonts
- **Monospace:** `'DM Mono', monospace` — for test IDs, timing data, code-like content
- **Nav labels:** DM Sans, 11px, uppercase, letter-spacing 1.5px
- **Section labels:** DM Sans, 10px, uppercase, letter-spacing 1.5px, `--text-muted`

### Spacing & Radii

- Card padding: 24px
- Section gap: 32px
- Card border-radius: 12px
- Button border-radius: 8px
- Status pill border-radius: 20px
- Input border-radius: 8px
- Modal border-radius: 16px

### Transitions

- Default: `all 0.2s ease`
- Cards on hover: `transform: translateY(-1px)` + `--shadow-hover`
- Buttons on hover: background color shift
- Nav links: color transition

## Implementation Approach

Update `tailwind.config.js` to extend with custom colors, fonts, and radii. Define CSS custom properties in `style.css` for the color tokens. Add Google Fonts link in `index.html`. Then restyle each file by replacing default Tailwind classes with the new design system.

### Tailwind Config Changes

Extend `theme` with:
- `colors.primary`, `colors.cream`, `colors.surface`, etc.
- `fontFamily.serif`, `fontFamily.sans`, `fontFamily.mono`
- `borderRadius.card`, `borderRadius.button`, `borderRadius.pill`
- `boxShadow.card`, `boxShadow.card-hover`

### Files to Modify

1. **`index.html`** — Add Google Fonts `<link>` for DM Serif Display, DM Sans, DM Mono
2. **`tailwind.config.js`** — Extend theme with design tokens
3. **`src/style.css`** — CSS custom properties, base styles, remove system font stack
4. **`src/App.vue`** — Warm cream bg, refined nav with serif title, uppercase nav links, indigo active state
5. **`src/views/Dashboard.vue`** — Remove dashed border, serif heading, warm stat cards, indigo CTA
6. **`src/views/TestsList.vue`** — Soft test cards with hover lift, indigo Run button, refined tags/actions
7. **`src/views/TestResults.vue`** — Indigo active tab toggle, softer result cards, warm color scheme
8. **`src/views/TestResultDetail.vue`** — Refined header, softer step cards, warm accordion styling
9. **`src/views/TestCreator.vue`** — Warm form fields, indigo submit button
10. **`src/views/Configuration.vue`** — Warm form styling, indigo save button
11. **`src/components/CreateTestModal.vue`** — Warm overlay (cream tint), rounded panel, indigo primary button
12. **`src/components/EditTestModal.vue`** — Same modal treatment
13. **`src/components/RecordingModal.vue`** — Same modal treatment, warm status colors

### Mapping Old Classes to New

| Old Pattern | New Pattern |
|-------------|-------------|
| `bg-gray-50` (page) | `bg-cream` |
| `bg-white shadow` (cards) | `bg-surface shadow-card rounded-card border border-border` |
| `bg-blue-600` (primary btn) | `bg-primary hover:bg-primary-hover` |
| `text-blue-600` (links) | `text-primary` |
| `border-blue-500` (active) | `border-primary` |
| `bg-green-100 text-green-800` (pass) | `bg-success-bg text-success` |
| `bg-red-100 text-red-800` (fail) | `bg-danger-bg text-danger` |
| `text-gray-900` (headings) | `text-heading font-serif` |
| `text-gray-500` (secondary) | `text-secondary` |
| `rounded-md` / `rounded-lg` | `rounded-button` / `rounded-card` |

## What's NOT Changing

- Component logic, store/service architecture, routing
- Functionality, API calls, data flow
- File structure — no new files except possibly a shared utility if needed

## Success Criteria

- Every view uses the warm cream background, DM font family, and indigo accent consistently
- Cards have soft shadows, generous padding, hover lift effect
- No default Tailwind blue (`blue-600`) or gray (`gray-50`) remains in the UI
- Pass/fail states use the green/red tokens, not default Tailwind greens/reds
- Modals have warm overlay tint and rounded panels
- Typography hierarchy is clear: serif headings, sans body, mono for technical data
