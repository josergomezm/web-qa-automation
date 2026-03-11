# Warm Minimal Reskin Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reskin the entire Vue 3 frontend from default Tailwind to a Warm Minimal aesthetic with Ink Indigo accent.

**Architecture:** Pure visual changes only — no logic, routing, or data flow changes. Foundation layer (tailwind config, CSS variables, fonts) is set up first, then each view/component is restyled using the new design tokens. Each task produces a visually complete, commit-ready unit.

**Tech Stack:** Vue 3, Tailwind CSS 3, Google Fonts (DM Serif Display, DM Sans, DM Mono)

**Spec:** `docs/superpowers/specs/2026-03-10-warm-minimal-reskin-design.md`

---

## Chunk 1: Foundation + App Shell

### Task 1: Add Google Fonts

**Files:**
- Modify: `frontend/index.html`

- [ ] **Step 1: Add font preconnect and stylesheet links**

Add these inside `<head>`, before the viewport meta tag:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700&family=DM+Serif+Display&display=swap" rel="stylesheet">
```

- [ ] **Step 2: Verify fonts load**

Run: `cd frontend && npm run dev`

Open the app in browser, open DevTools > Network tab, confirm `fonts.googleapis.com` requests succeed. Confirm text renders in DM Sans (check computed styles on any element).

- [ ] **Step 3: Commit**

```bash
git add frontend/index.html
git commit -m "feat: add DM font family from Google Fonts"
```

---

### Task 2: Configure Tailwind design tokens

**Files:**
- Modify: `frontend/tailwind.config.js`

- [ ] **Step 1: Extend theme with full design system**

Replace the entire file contents with:

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: '#faf8f5',
        surface: '#ffffff',
        border: '#eeeeee',
        'border-hover': '#dddddd',
        primary: {
          DEFAULT: '#3d5a80',
          hover: '#2c4460',
          light: '#eef2f7',
        },
        heading: '#2c2c2c',
        secondary: '#999999',
        muted: '#bbbbbb',
        success: {
          DEFAULT: '#2e7d32',
          bg: '#e8f5e9',
        },
        danger: {
          DEFAULT: '#c62828',
          bg: '#fbe9e7',
        },
        warning: {
          DEFAULT: '#e65100',
          bg: '#fff3e0',
        },
      },
      fontFamily: {
        serif: ['"DM Serif Display"', 'serif'],
        sans: ['"DM Sans"', 'sans-serif'],
        mono: ['"DM Mono"', 'monospace'],
      },
      borderRadius: {
        card: '12px',
        button: '8px',
        pill: '20px',
        modal: '16px',
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.04)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.06)',
      },
    },
  },
  plugins: [],
}
```

- [ ] **Step 2: Verify Tailwind picks up new tokens**

Run: `cd frontend && npm run dev`

Open browser, add `class="bg-cream text-primary font-serif"` temporarily to any element in Vue DevTools. Confirm the custom colors/fonts apply. Remove the test classes.

- [ ] **Step 3: Commit**

```bash
git add frontend/tailwind.config.js
git commit -m "feat: add Warm Minimal design tokens to Tailwind config"
```

---

### Task 3: Update base CSS

**Files:**
- Modify: `frontend/src/style.css`

- [ ] **Step 1: Replace style.css with design system base styles**

Replace the entire file with:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    font-family: 'DM Sans', sans-serif;
    background-color: #faf8f5;
    color: #2c2c2c;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  /* Form element base styling */
  input[type="text"],
  input[type="url"],
  input[type="password"],
  input[type="email"],
  input[type="number"],
  select,
  textarea {
    @apply rounded-button border-border bg-surface font-sans text-heading;
  }

  input:focus,
  select:focus,
  textarea:focus {
    @apply border-primary ring-1 ring-primary/20;
  }
}

@layer components {
  /* Card hover lift effect */
  .card-hover {
    @apply transition-all duration-200 ease-in-out;
  }
  .card-hover:hover {
    @apply shadow-card-hover -translate-y-0.5;
  }

  /* Nav label style */
  .nav-label {
    @apply font-sans text-[11px] uppercase tracking-[1.5px] font-semibold;
  }

  /* Section label style */
  .section-label {
    @apply font-sans text-[10px] uppercase tracking-[1.5px] text-muted font-semibold;
  }
}
```

- [ ] **Step 2: Verify base styles apply**

Run: `cd frontend && npm run dev`

Open browser. Background should now be warm cream `#faf8f5`, text should render in DM Sans. Form inputs on Configuration page should have rounded-button radius.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/style.css
git commit -m "feat: add Warm Minimal base styles and component utilities"
```

---

### Task 4: Restyle App.vue shell

**Files:**
- Modify: `frontend/src/App.vue`

- [ ] **Step 1: Replace App.vue template and styles**

Replace the full `<template>` with:

```html
<template>
  <div id="app" class="min-h-screen bg-cream">
    <nav class="bg-surface border-b border-border">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16">
          <div class="flex items-center">
            <h1 class="font-serif text-xl text-heading">QA Automation</h1>
          </div>
          <div class="flex items-center space-x-8">
            <router-link to="/" class="nav-link">Dashboard</router-link>
            <router-link to="/tests" class="nav-link">Tests</router-link>
            <router-link to="/config" class="nav-link">Configuration</router-link>
          </div>
        </div>
      </div>
    </nav>

    <main class="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <router-view />
    </main>
  </div>
</template>
```

Replace the full `<style scoped>` with:

```html
<style scoped>
.nav-link {
  @apply nav-label text-secondary transition-colors duration-200 border-b-2 border-transparent py-5;
}

.nav-link:hover {
  @apply text-heading;
}

.nav-link.router-link-active {
  @apply text-primary border-primary;
}
</style>
```

- [ ] **Step 2: Verify app shell**

Run: `cd frontend && npm run dev`

Confirm: warm cream page background, white nav bar with faint border, serif "QA Automation" title, uppercase nav links in DM Sans, indigo active underline on current route. Click between routes — transitions should be smooth.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/App.vue
git commit -m "feat: restyle App shell with Warm Minimal design"
```

---

## Chunk 2: Dashboard + TestCreator + Configuration

### Task 5: Restyle Dashboard.vue

**Files:**
- Modify: `frontend/src/views/Dashboard.vue`

- [ ] **Step 1: Replace Dashboard template**

Replace the full `<template>` with:

```html
<template>
  <div class="space-y-8">
    <div>
      <h2 class="font-serif text-3xl text-heading">Dashboard</h2>
      <p class="text-secondary mt-2">Create and manage your automated web tests.</p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div class="bg-surface p-6 rounded-card shadow-card border border-border">
        <p class="section-label mb-2">Total Tests</p>
        <p class="text-3xl font-bold text-heading">{{ testStore.tests.length }}</p>
      </div>

      <div class="bg-surface p-6 rounded-card shadow-card border border-border">
        <p class="section-label mb-2">Passed Results</p>
        <p class="text-3xl font-bold text-success">{{ passedTests }}</p>
      </div>

      <div class="bg-surface p-6 rounded-card shadow-card border border-border">
        <p class="section-label mb-2">Failed Results</p>
        <p class="text-3xl font-bold text-danger">{{ failedTests }}</p>
      </div>
    </div>

    <div class="flex items-center space-x-4">
      <button
        @click="showCreateModal = true"
        class="px-6 py-3 bg-primary text-white text-sm font-semibold rounded-button hover:bg-primary-hover transition-colors duration-200"
      >
        Create New Test
      </button>

      <router-link
        to="/tests"
        class="px-6 py-3 bg-surface border border-border text-heading text-sm font-medium rounded-button hover:border-border-hover transition-colors duration-200"
      >
        View Tests
      </router-link>
    </div>

    <CreateTestModal
      :is-open="showCreateModal"
      @close="showCreateModal = false"
      @test-created="handleTestCreated"
    />
  </div>
</template>
```

The `<script setup>` stays exactly the same — no logic changes.

- [ ] **Step 2: Verify dashboard**

Run: `cd frontend && npm run dev`

Confirm: serif "Dashboard" heading, warm stat cards with soft shadow, indigo "Create New Test" button, no more dashed border box.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/views/Dashboard.vue
git commit -m "feat: restyle Dashboard with Warm Minimal design"
```

---

### Task 6: Restyle TestCreator.vue

**Files:**
- Modify: `frontend/src/views/TestCreator.vue`

- [ ] **Step 1: Restyle the template**

Apply these class replacements throughout the `<template>`:

| Find | Replace |
|------|---------|
| `class="max-w-4xl mx-auto"` | `class="max-w-4xl mx-auto"` (keep) |
| `class="bg-white shadow rounded-lg"` | `class="bg-surface shadow-card rounded-card border border-border"` |
| `class="text-lg leading-6 font-medium text-gray-900 mb-4"` | `class="font-serif text-2xl text-heading mb-4"` |
| `class="block text-sm font-medium text-gray-700"` | `class="block text-sm font-medium text-heading"` |
| `class="text-sm text-gray-500 mb-2"` and `class="text-sm text-gray-500 mt-1"` | Replace `text-gray-500` with `text-secondary` |
| All `focus:ring-blue-500 focus:border-blue-500` | `focus:ring-primary/20 focus:border-primary` |
| `class="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"` (Cancel btn) | `class="px-4 py-2 border border-border rounded-button text-sm font-medium text-secondary hover:text-heading hover:border-border-hover transition-colors duration-200"` |
| `class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"` (Submit btn) | `class="px-4 py-2 bg-primary text-white rounded-button text-sm font-semibold hover:bg-primary-hover disabled:opacity-50 transition-colors duration-200"` |
| `class="text-blue-600 hover:text-blue-800 text-sm"` (Add form field) | `class="text-primary hover:text-primary-hover text-sm font-medium transition-colors duration-200"` |
| `class="px-3 py-2 text-red-600 hover:text-red-800"` (Remove btn) | `class="px-3 py-2 text-danger hover:text-danger/80 transition-colors duration-200"` |

- [ ] **Step 2: Verify TestCreator**

Navigate to the test creator page. Confirm: serif heading, warm form fields, indigo submit button, warm cancel button, no blue-600 remnants.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/views/TestCreator.vue
git commit -m "feat: restyle TestCreator with Warm Minimal design"
```

---

### Task 7: Restyle Configuration.vue

**Files:**
- Modify: `frontend/src/views/Configuration.vue`

- [ ] **Step 1: Restyle the template**

Apply these class replacements throughout the `<template>`:

| Find | Replace |
|------|---------|
| `class="bg-white shadow rounded-lg"` | `class="bg-surface shadow-card rounded-card border border-border"` |
| `class="text-lg leading-6 font-medium text-gray-900 mb-4"` | `class="font-serif text-2xl text-heading mb-4"` |
| `class="block text-sm font-medium text-gray-700"` | `class="block text-sm font-medium text-heading"` |
| All `text-gray-500` | `text-secondary` |
| All `text-gray-700` (non-heading context) | `text-heading` |
| All `focus:ring-blue-500 focus:border-blue-500` | `focus:ring-primary/20 focus:border-primary` |
| `border-gray-300 rounded-md shadow-sm` on inputs/selects | `border-border rounded-button` |
| `bg-yellow-50 border border-yellow-200` (API key warning) | `bg-warning-bg border border-warning/20` |
| `text-yellow-800` | `text-warning` |
| Cancel button classes | `px-4 py-2 border border-border rounded-button text-sm font-medium text-secondary hover:text-heading hover:border-border-hover transition-colors duration-200` |
| Save button (`bg-blue-600 hover:bg-blue-700`) | `bg-primary hover:bg-primary-hover rounded-button transition-colors duration-200` |
| Test Connection button (`border-gray-300`) | `border-border rounded-button text-secondary hover:text-heading hover:border-border-hover transition-colors duration-200` |
| Connection status success (`bg-green-100 text-green-800`) | `bg-success-bg text-success` |
| Connection status fail (`bg-red-100 text-red-800`) | `bg-danger-bg text-danger` |

- [ ] **Step 2: Verify Configuration**

Navigate to /config. Confirm: serif heading, warm form fields with proper border-radius, indigo save button, warm connection status pills.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/views/Configuration.vue
git commit -m "feat: restyle Configuration with Warm Minimal design"
```

---

## Chunk 3: TestsList

### Task 8: Restyle TestsList.vue

**Files:**
- Modify: `frontend/src/views/TestsList.vue`

- [ ] **Step 1: Restyle the page header and tab toggle**

Replace the header section (lines 3-32, the `flex justify-between` container with heading + tabs + create button):

The page heading `text-2xl font-bold text-gray-900` becomes `font-serif text-2xl text-heading`.

Tab toggle buttons — replace:
- Active state: `bg-blue-600 text-white border-blue-600` → `bg-primary text-white border-primary`
- Inactive state: `bg-white text-gray-700 border-gray-300 hover:bg-gray-50` → `bg-surface text-secondary border-border hover:text-heading hover:border-border-hover`
- Round corners: `rounded-l-md` / `rounded-r-md` → `rounded-l-button` / `rounded-r-button`

"Create New Test" button — replace `text-white bg-blue-600 hover:bg-blue-700` with `text-white bg-primary hover:bg-primary-hover rounded-button transition-colors duration-200`.

- [ ] **Step 2: Restyle the error banner and empty state**

Error banner: `bg-red-50 border border-red-200` → `bg-danger-bg border border-danger/20` and `text-red-800` → `text-danger`.

Loading spinner: `border-b-2 border-blue-600` → `border-b-2 border-primary`, `text-gray-600` → `text-secondary`.

Empty state: `text-gray-400` (icon) → `text-muted`, `text-gray-900` (heading) → `text-heading`, `text-gray-500` (description) → `text-secondary`. Empty state CTA: same primary button styling as above.

- [ ] **Step 3: Restyle test cards**

For each test card `v-for="test in displayedTests"`:

Card container: Replace `bg-white shadow rounded-lg overflow-hidden hover:shadow-md transition-shadow flex flex-col` with `bg-surface shadow-card rounded-card border border-border card-hover flex flex-col`.

Card body (`px-6 py-5 flex-1`): Change to `p-6 flex-1`.

Test name: `text-lg font-bold text-gray-900` → `text-lg font-semibold text-heading`.

Date: `text-xs text-gray-500` → `text-xs text-muted`.

Metadata pills:
- AI model pill: `bg-blue-100 text-blue-800 border border-blue-200` → `bg-primary-light text-primary border border-primary/20`
- Reusable pill: `bg-teal-100 text-teal-800 border border-teal-200` → keep as-is (teal is fine for reusable)
- Prerequisites pill: keep purple (it's already good contrast)
- Cached pill: keep green (semantic meaning is correct)
- URL text: `text-gray-400` (separator) → `text-muted`, `text-gray-600` (url text) → `text-secondary`

Description: `text-sm text-gray-700` → `text-sm text-heading/80`.

Details grid background: `bg-gray-50 rounded-md p-3 border border-gray-100` → `bg-cream rounded-card p-4 border border-border`.

Details labels: `text-xs font-semibold text-gray-500 uppercase tracking-wider` → `section-label`.

Details values: `text-gray-800` → `text-heading`, `text-gray-600` → `text-secondary`, `text-gray-700` → `text-heading`.

- [ ] **Step 4: Restyle card footer and action buttons**

Footer: `bg-gray-50 px-6 py-3 border-t border-gray-100` → `bg-cream/50 px-6 py-3 border-t border-border`.

Tag pills: `bg-gray-200 text-gray-700` → `bg-cream text-secondary border border-border`.

Edit tags button hover: `hover:text-gray-600 hover:bg-gray-200` → `hover:text-heading hover:bg-cream`.

Add tags button: `text-gray-500 hover:text-gray-700 hover:bg-gray-200 border border-dashed border-gray-300` → `text-muted hover:text-heading hover:bg-cream border border-dashed border-border`.

Run button: `text-white bg-green-600 hover:bg-green-700 focus:ring-green-500` → `text-white bg-success hover:bg-success/90 rounded-button transition-colors duration-200`.

Results button: `border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:ring-blue-500` → `border-border text-heading bg-surface hover:border-border-hover rounded-button transition-colors duration-200`.

Divider: `bg-gray-300` → `bg-border`.

Icon action buttons — replace hover states:
- Clear cache: keep `text-purple-600 hover:bg-purple-50`
- Edit: `text-gray-500 hover:text-gray-700 hover:bg-gray-100` → `text-secondary hover:text-heading hover:bg-cream`
- Archive/unarchive: keep orange/blue colors
- Delete: keep `text-red-600 hover:bg-red-50` → `text-danger hover:bg-danger-bg`

- [ ] **Step 5: Verify TestsList**

Navigate to /tests. Confirm: serif heading, indigo tabs, warm test cards with hover lift, indigo create button, refined tags and action buttons, no blue-600 or gray-50 remnants.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/views/TestsList.vue
git commit -m "feat: restyle TestsList with Warm Minimal design"
```

---

## Chunk 4: TestResults + TestResultDetail

### Task 9: Restyle TestResults.vue

**Files:**
- Modify: `frontend/src/views/TestResults.vue`

- [ ] **Step 1: Restyle navigation and header**

Back link: `text-blue-600 hover:text-blue-800` → `text-primary hover:text-primary-hover transition-colors duration-200`.

Refresh button: `bg-blue-600 text-white rounded-md hover:bg-blue-700` → `bg-primary text-white rounded-button hover:bg-primary-hover transition-colors duration-200`.

Page title: `text-2xl font-bold text-gray-900` → `font-serif text-2xl text-heading`.

Test description: `text-lg text-gray-600` → `text-secondary`.

Tab toggle: same pattern as TestsList Task 8 Step 1 — `bg-blue-600` → `bg-primary`, inactive: `bg-white text-gray-700 border-gray-300` → `bg-surface text-secondary border-border`.

- [ ] **Step 2: Restyle result cards**

Error banner: `bg-red-50 border border-red-200` → `bg-danger-bg border border-danger/20`, `text-red-800` → `text-danger`.

Empty state: `text-gray-500` → `text-secondary`, back link → `text-primary hover:text-primary-hover`.

Result card container: `bg-white shadow rounded-lg` → `bg-surface shadow-card rounded-card border border-border`.

Card header border: `border-b border-gray-200` → `border-b border-border`.

Status dot: keep green/red/yellow/gray — these are semantic.

Status heading: `text-lg font-medium text-gray-900` → `text-lg font-medium text-heading`.

Archive pill: keep orange.

Date: `text-sm text-gray-500` → `text-sm text-muted`.

"View Details" link: `border border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100` → `border border-primary/30 text-primary bg-primary-light hover:bg-primary/10 rounded-button transition-colors duration-200`.

Archive/unarchive button: keep orange/blue coloring.

- [ ] **Step 3: Restyle performance stats and steps**

Stats text: `text-blue-600` → `text-primary`, keep green/purple/orange for semantic stats.

`text-sm text-gray-500` (stat labels) → `section-label`.

Error block inside card: `bg-red-50 border border-red-200` → `bg-danger-bg border border-danger/20`, `text-red-800 text-sm` → `text-danger text-sm`.

Prerequisite section heading: `font-medium text-gray-900` → `font-medium text-heading`.

Step items: keep green/red/purple backgrounds (semantic). Replace `text-gray-500` timestamps with `text-muted`.

Console errors section: `font-medium text-gray-900` → `font-medium text-heading`. `bg-red-50 border border-red-200` → `bg-danger-bg border border-danger/20`.

Screenshots heading: `font-medium text-gray-900` → `font-medium text-heading`.

- [ ] **Step 4: Restyle screenshot modal**

The screenshot modal already has dark overlay which works. Just update the close button to use `rounded-pill` instead of `rounded-full`.

- [ ] **Step 5: Verify TestResults**

Navigate to a test's results page. Confirm: warm cards, indigo tabs, proper semantic colors, serif heading, no blue-600 remnants.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/views/TestResults.vue
git commit -m "feat: restyle TestResults with Warm Minimal design"
```

---

### Task 10: Restyle TestResultDetail.vue

**Files:**
- Modify: `frontend/src/views/TestResultDetail.vue`

- [ ] **Step 1: Restyle loading, error, and header**

Loading spinner: `border-b-2 border-blue-600` → `border-b-2 border-primary`, `text-gray-600` → `text-secondary`.

Error banner: `bg-red-50 border border-red-200` → `bg-danger-bg border border-danger/20`, `text-red-800` → `text-danger`.

Header card: `bg-white shadow rounded-lg p-6` → `bg-surface shadow-card rounded-card border border-border p-6`.

Back button: `text-gray-400 hover:text-gray-600` → `text-muted hover:text-heading transition-colors duration-200`.

Title: `text-2xl font-bold text-gray-900` → `font-serif text-2xl text-heading`.

Date: `text-sm text-gray-500` → `text-sm text-muted`.

Running status banner: `bg-blue-50 border border-blue-100` → `bg-primary-light border border-primary/20`, spinner `border-blue-600` → `border-primary`, text `text-blue-800` → `text-primary`.

Cached steps indicator: keep green (semantic).

Stat labels: `text-sm text-gray-500` → `section-label`.

Stat values: `text-blue-600` → `text-primary`, keep green/red/purple/orange.

- [ ] **Step 2: Restyle steps section**

Steps container: `bg-white shadow rounded-lg p-6` → `bg-surface shadow-card rounded-card border border-border p-6`.

Section headings: `text-lg font-medium text-gray-900` → `text-lg font-medium text-heading`.

Step cards: keep green/red/purple backgrounds (semantic). Replace:
- `text-sm font-medium text-gray-900` → `text-sm font-medium text-heading`
- `text-sm text-gray-600` → `text-sm text-secondary`
- `text-sm text-gray-500` → `text-sm text-secondary`
- `text-xs text-gray-500` → `text-xs text-muted`

Error blocks in steps: `bg-red-100 border border-red-200` → `bg-danger-bg border border-danger/20`, `text-red-800` → `text-danger`.

Screenshot accordion button: `bg-gray-50 hover:bg-gray-100` → `bg-cream hover:bg-cream/80`, `text-gray-500` icon → `text-muted`, `text-sm font-medium text-gray-700` → `text-sm font-medium text-heading`, chevron `text-gray-400` → `text-muted`.

Screenshot container: `bg-white` → `bg-surface`, `text-xs text-gray-500` → `text-xs text-muted`.

- [ ] **Step 3: Restyle console messages and network calls accordions**

Accordion containers: `bg-white shadow rounded-lg` → `bg-surface shadow-card rounded-card border border-border`.

Accordion buttons: `text-lg font-medium text-gray-900` → `text-lg font-medium text-heading`, chevron `text-gray-400` → `text-muted`.

Badge pills: `bg-gray-100 text-gray-800` → `bg-cream text-heading border border-border`. Keep red/yellow semantic pills.

Console message types: keep semantic colors (red for error, yellow for warning, blue for info). Replace `bg-gray-50 text-gray-800 border border-gray-200` (log type) with `bg-cream text-heading border border-border`.

Network table: `bg-gray-50` header → `bg-cream`, `text-gray-500 uppercase` → `section-label`, `divide-gray-200` → `divide-border`, `text-gray-900` cells → `text-heading`, `text-gray-500` cells → `text-muted`. Keep method/status color pills.

- [ ] **Step 4: Verify TestResultDetail**

Navigate to a specific result detail page. Confirm: warm cards, refined step display, proper accordion styling, serif heading, indigo accent where used.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/views/TestResultDetail.vue
git commit -m "feat: restyle TestResultDetail with Warm Minimal design"
```

---

## Chunk 5: Modals

### Task 11: Restyle CreateTestModal.vue

**Files:**
- Modify: `frontend/src/components/CreateTestModal.vue`

- [ ] **Step 1: Restyle modal structure**

Overlay: `bg-gray-500 bg-opacity-75` → `bg-heading/60 backdrop-blur-sm`.

Modal panel: `bg-white rounded-lg text-left overflow-hidden shadow-xl` → `bg-surface rounded-modal text-left overflow-hidden shadow-card-hover`.

Title: `text-lg leading-6 font-medium text-gray-900` → `font-serif text-xl text-heading`.

Close button: `text-gray-400 hover:text-gray-600` → `text-muted hover:text-heading transition-colors duration-200`.

- [ ] **Step 2: Restyle form elements**

All labels `text-sm font-medium text-gray-700` → `text-sm font-medium text-heading`.

All help text `text-sm text-gray-500` / `text-xs text-gray-500` → `text-secondary` / `text-xs text-secondary`.

All inputs: add `rounded-button` if not inherited from base CSS. Replace `focus:ring-blue-500 focus:border-blue-500` → `focus:ring-primary/20 focus:border-primary`.

Prerequisite checkbox list: `border border-gray-200 rounded-md p-2` → `border border-border rounded-card p-3`.

Checkbox styling: `text-blue-600 focus:ring-blue-500` → `text-primary focus:ring-primary/20`.

Prerequisite debug text: `text-sm text-gray-500` → `text-sm text-secondary`.

Recording button: `border-gray-300 ... text-gray-700 hover:bg-gray-50 focus:ring-blue-500` → `border-border text-heading hover:bg-cream focus:ring-primary/20 rounded-button transition-colors duration-200`.

Note about prerequisites: `text-xs text-amber-600` → `text-xs text-warning`.

Tags input: same styling as other inputs.

Wait config section: `bg-gray-50 p-4 rounded-md` → `bg-cream p-4 rounded-card border border-border`.

Wait config title: `text-sm font-medium text-gray-900` → `text-sm font-semibold text-heading`.

Recorded steps display: `bg-gray-50 p-4 rounded-md border border-gray-200` → `bg-cream p-4 rounded-card border border-border`. Inner code area: `bg-white p-2 rounded border border-gray-200` → `bg-surface p-3 rounded-button border border-border`. Step action: `text-blue-600` → `text-primary`. Step value: `text-green-600` → `text-success`. Checkmark text: `text-xs text-green-600` → `text-xs text-success`.

- [ ] **Step 3: Restyle modal footer**

Footer: `bg-gray-50 px-4 py-3` → `bg-cream/50 px-4 py-3 border-t border-border`.

Primary button: `bg-blue-600 ... hover:bg-blue-700 focus:ring-blue-500` → `bg-primary text-white rounded-button font-semibold hover:bg-primary-hover transition-colors duration-200`.

Cancel button: `border-gray-300 ... text-gray-700 hover:bg-gray-50 focus:ring-indigo-500` → `border-border text-secondary rounded-button hover:text-heading hover:border-border-hover transition-colors duration-200`.

- [ ] **Step 4: Verify CreateTestModal**

Click "Create New Test" from Dashboard or Tests. Confirm: warm tinted overlay with blur, rounded modal, serif title, warm form fields, indigo CTA, warm footer.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/CreateTestModal.vue
git commit -m "feat: restyle CreateTestModal with Warm Minimal design"
```

---

### Task 12: Restyle EditTestModal.vue

**Files:**
- Modify: `frontend/src/components/EditTestModal.vue`

- [ ] **Step 1: Restyle modal**

Apply the exact same modal structure changes as CreateTestModal (Task 11 Step 1):
- Overlay: `bg-heading/60 backdrop-blur-sm`
- Panel: `bg-surface rounded-modal shadow-card-hover`
- Title: `font-serif text-xl text-heading`
- Close button: `text-muted hover:text-heading`

- [ ] **Step 2: Restyle form content**

Error banner: `bg-red-50 border border-red-200` → `bg-danger-bg border border-danger/20`, `text-red-800` → `text-danger`.

Test info readonly block: `bg-gray-50 p-4 rounded-md` → `bg-cream p-4 rounded-card border border-border`.

All labels: `text-sm font-medium text-gray-700` → `text-sm font-medium text-heading`.

All help text: `text-xs text-gray-500` → `text-xs text-secondary`.

Checkboxes: `text-blue-600 focus:ring-blue-500` → `text-primary focus:ring-primary/20`.

Tags display: `bg-blue-100 text-blue-800` → `bg-primary-light text-primary`.

Wait config section: `bg-gray-50 p-4 rounded-md` → `bg-cream p-4 rounded-card border border-border`, title `text-sm font-medium text-gray-900` → `text-sm font-semibold text-heading`.

Prerequisites readonly: `bg-gray-50 p-3 rounded-md` → `bg-cream p-3 rounded-card border border-border`.

Test info stats: `bg-blue-50 p-3 rounded-md` → `bg-primary-light p-3 rounded-card border border-primary/10`, `text-sm font-medium text-blue-900` → `text-sm font-semibold text-primary`, `text-xs text-blue-800` → `text-xs text-primary`.

- [ ] **Step 3: Restyle footer**

Same as CreateTestModal footer (Task 11 Step 3).

- [ ] **Step 4: Verify EditTestModal**

Click Edit on a test. Confirm: warm modal styling, serif title, warm form areas, indigo save button.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/EditTestModal.vue
git commit -m "feat: restyle EditTestModal with Warm Minimal design"
```

---

### Task 13: Restyle RecordingModal.vue

**Files:**
- Modify: `frontend/src/components/RecordingModal.vue`

- [ ] **Step 1: Restyle modal structure**

Overlay: `bg-gray-900 bg-opacity-75` → `bg-heading/60 backdrop-blur-sm`.

Panel: same as other modals — `bg-surface rounded-modal shadow-card-hover`.

- [ ] **Step 2: Restyle instruction state**

Icon circle: `bg-blue-100` → `bg-primary-light`, icon `text-blue-600` → `text-primary`.

Heading: `text-lg leading-6 font-medium text-gray-900` → `font-serif text-xl text-heading`.

Description: `text-sm text-gray-500` → `text-sm text-secondary`.

Instructions box: `bg-blue-50 border border-blue-200` → `bg-primary-light border border-primary/20`, title `text-sm font-semibold text-blue-800` → `text-sm font-semibold text-primary`, list items `text-sm text-blue-700` → `text-sm text-primary/80`.

Cancel button: `border-gray-300 ... text-gray-700 hover:bg-gray-50` → `border-border text-secondary rounded-button hover:text-heading hover:border-border-hover transition-colors duration-200`.

Start button: `bg-red-600 ... hover:bg-red-700` → `bg-danger text-white rounded-button font-semibold hover:bg-danger/90 transition-colors duration-200`.

- [ ] **Step 3: Restyle recording/processing/error states**

Recording state: keep red pulse animation (semantic — recording). Replace `text-lg leading-6 font-medium text-gray-900` → `font-serif text-xl text-heading`, `text-sm text-gray-500` → `text-sm text-secondary`. Status box: `bg-gray-50 border border-gray-200` → `bg-cream border border-border`, `text-sm text-gray-700` → `text-sm text-heading`.

Processing state: spinner `text-blue-600` → `text-primary`, circle `bg-blue-100` → `bg-primary-light`. Heading and description: same as above.

Error state: keep red icon (semantic). Heading/description: same pattern. Close button: `border-gray-300 ... text-gray-700 hover:bg-gray-50 focus:ring-blue-500` → `border-border text-secondary rounded-button hover:text-heading hover:border-border-hover transition-colors duration-200`.

- [ ] **Step 4: Verify RecordingModal**

Open the recording modal from CreateTestModal. Confirm: warm overlay, warm instruction box with indigo tones, proper state styling.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/RecordingModal.vue
git commit -m "feat: restyle RecordingModal with Warm Minimal design"
```

---

## Chunk 6: Final verification

### Task 14: Full visual audit

- [ ] **Step 1: Check every route**

Run: `cd frontend && npm run dev`

Visit each route and confirm warm minimal styling:
- `/` — Dashboard
- `/tests` — TestsList
- `/tests/create` — TestCreator
- `/config` — Configuration

- [ ] **Step 2: Grep for leftover default Tailwind classes**

Run these searches from the `frontend/src` directory and fix any remaining default blue/gray classes:

```bash
grep -rn "blue-600\|blue-700\|blue-500\|blue-800\|blue-300\|blue-50\|blue-100" --include="*.vue" frontend/src/
grep -rn "bg-gray-50\b" --include="*.vue" frontend/src/
grep -rn "text-gray-900\b" --include="*.vue" frontend/src/
```

Fix any hits that are NOT inside semantic contexts (e.g., `text-gray-900` that should be `text-heading`). Some intentional gray usage may remain in very specific contexts — use judgment.

- [ ] **Step 3: Type-check**

Run: `cd frontend && npx vue-tsc --noEmit`

Expected: no errors (this is a visual-only change, types should be unaffected).

- [ ] **Step 4: Build check**

Run: `cd frontend && npm run build`

Expected: successful build with no errors.

- [ ] **Step 5: Final commit if any fixes were needed**

```bash
git add -u frontend/
git commit -m "fix: clean up remaining default Tailwind classes from reskin"
```
