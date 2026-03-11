# Web QA Automation

Natural-language web testing tool. Users describe tests in plain English (or record them via Playwright codegen), an AI provider generates structured test steps, and Playwright executes them in a real browser.

## Tech Stack

- **Frontend:** Vue 3.5 + TypeScript 5.7 + Vite 6 + Tailwind CSS + Pinia 3 (state) + Vue Router 4.5
- **Backend:** Node.js + Express + TypeScript (`ts-node-dev` for dev)
- **Automation:** Playwright (base `playwright` package, NOT `@playwright/test`)
- **AI Providers:** OpenAI, Anthropic, Google Generative AI (multi-provider, user-configured)
- **Database:** Local JSON file storage (`backend/src/services/database.ts`)
- **Shared Types:** `shared/types.ts` (imported via `@shared/types` path alias)

## Project Structure

```
backend/
  src/
    index.ts              # Express server (port 8080)
    routes/
      tests.ts            # POST /api/tests — create & execute tests
      results.ts          # GET /api/results — retrieve test results
      recording.ts        # POST /api/recording/start — Playwright codegen recording
      groups.ts           # /api/groups — group CRUD + parallel execution + device list; /api/group-runs
    services/
      automation.ts       # Playwright browser automation (step executor)
      ai.ts               # Multi-provider AI service (step generation, retries)
      testExecution.ts    # Shared executeTestAsync (used by tests + groups routes)
      prompt.template.ts  # AI prompt templates
      database.ts         # JSON file persistence (with write serialization for concurrency)
    utils/
      logger.ts
frontend/
  src/
    services/
      api.ts              # Axios wrapper — reads backendUrl from config store
      testApi.ts           # Test CRUD operations (pure functions)
      resultApi.ts         # Result CRUD operations (pure functions)
      recordingApi.ts      # Recording endpoint
      groupApi.ts          # Group CRUD + execution + group runs
    stores/
      config.ts            # useConfigStore — AI config + backendUrl (localStorage)
      tests.ts             # useTestStore — test state, per-action loading flags
      results.ts           # useResultStore — result state, per-action loading flags
      groups.ts            # useGroupStore — group state, group runs, per-action loading flags
    views/                 # Dashboard, TestCreator, TestsList, TestResults, TestResultDetail, Configuration, GroupsView, GroupRunDetail
    components/            # RecordingModal, CreateTestModal, EditTestModal, CreateGroupModal, EditGroupModal
shared/
  types.ts                # TestStep, TestRequest, TestResult, TestGroup, GroupRun, DeviceInfo, AIConfig, etc.
```

## Key Flows

1. **AI-generated tests:** User describes test in natural language -> AI generates TestStep[] -> AutomationService executes steps in Playwright browser
2. **Recorded tests:** User clicks Record -> Playwright codegen opens browser -> user interacts -> codegen output parsed into TestStep[] -> optionally AI-analyzed -> stored and executable
3. **Retry logic:** On failure, AI can regenerate steps with error context
4. **Group execution:** User creates a TestGroup (name, testIds, tags, maxParallel, devices) -> clicks Run Group -> backend creates a GroupRun, launches tests in a concurrency-limited pool (each test gets its own browser) -> GroupRun summary updates as tests complete -> frontend polls for live progress
5. **Device emulation:** Groups can specify `devices: string[]` (e.g., "iPhone 13", "Pixel 7"). Execution creates a test × device matrix — each test runs once per device. Empty devices = desktop only (backward compatible).

## Architecture Decisions

- Uses base `playwright` (not `@playwright/test`), so auto-retrying assertions (`expect`) are NOT available. Polling loops are the correct approach for custom wait conditions.
- Complex Playwright locators (e.g. `getByRole(...)`, `locator().filter()`) are resolved via `new Function('page', 'return page.' + selector)` with basic sanitization. This is necessary because Playwright codegen naturally produces these locators.
- `AutomationService.isComplexLocator()` and `resolveLocator()` centralize complex locator detection and execution — all smart methods (click/fill/type/verify/wait) delegate to these.
- Selector racing (`Promise.any`) is used in smartClick/smartFill/smartType to try multiple selector strategies in parallel.
- `DatabaseService` uses per-file write serialization (promise queue) to prevent race conditions during parallel test execution. `updateGroupRun()` performs atomic read-modify-write within the queue.
- `executeTestAsync` lives in `backend/src/services/testExecution.ts` (shared by single-test and group execution routes). Accepts optional `groupRunId` and `device` parameters.
- Device emulation uses `playwright.devices` registry. `AutomationService.initialize(deviceName?)` spreads device descriptors into `browser.newContext()` for viewport, userAgent, touch, and isMobile emulation. Unknown device names log a warning and proceed without emulation.
- `GET /api/groups/devices` returns a curated list of ~13 devices (DeviceInfo[]) from the Playwright device registry.
- Group parallel execution uses a concurrency pool (`executeWithConcurrencyLimit`) that limits simultaneous browser instances via `maxParallel` (1–10, default 3).

## Frontend Architecture (3-Layer Pattern)

1. **Services** (`services/`) — Pure functions wrapping API calls. No reactive state. Return promises.
2. **Stores** (`stores/`) — Pinia setup stores holding shared reactive state. Call service functions. Expose per-action loading flags.
3. **Views/Components** — Use stores for shared state. Local `ref()` for UI-only state (modals, accordions).

### Store Conventions

- **Per-action loading flags** instead of a single shared `loading` boolean:
  - `useTestStore`: `fetchingTests`, `creatingTest`, `executingTestId` (string|null — tracks which test is running)
  - `useResultStore`: `fetchingResults`
  - `useGroupStore`: `fetchingGroups`, `creatingGroup`, `executingGroupId` (string|null), `fetchingRuns`
- Method naming: `fetch*` for reads, `create*` for creates, `execute*` for running tests
- List fetches update the store's reactive array. Single-item fetches return data directly.
- `findTest(id)` helper for synchronous lookups from the store's cached array.
- Stores call services — never import axios directly in stores or components.

## Running

```bash
# Backend
cd backend && npm run dev    # runs on :8080

# Frontend
cd frontend && npm run dev   # runs on Vite default port
```

## Conventions

- Shared types live in `shared/types.ts`, imported as `@shared/types`
- Backend routes are Express routers mounted at `/api/*`
- `TestStep.target` is preferred over legacy `TestStep.element` field
- Keep automation service methods DRY — use `isComplexLocator()` / `resolveLocator()` instead of inline checks
- Frontend API calls go in `services/` — never use raw axios in views, components, or stores
- Use Pinia setup stores (composable syntax with `defineStore('id', () => {...})`)
- Per-action loading flags over shared booleans — each async action tracks its own state
- Group-level tags categorize the group's purpose (e.g., "admin", "smoke"); test-level tags categorize individual tests. No auto-population between them.
- Deleting a group removes its GroupRun records but preserves individual TestResults and tests
- On server startup, stale GroupRuns (status `'running'`) are marked `'cancelled'`
- Frontend uses Tailwind with a custom warm theme (`bg-surface`, `border-border`, `text-heading`, `text-secondary`, `rounded-modal`, `rounded-card`, `rounded-button`, `bg-cream`, `bg-primary`, `hover:bg-primary-hover`). Do NOT use generic dark-mode Tailwind classes (`dark:bg-gray-800`, `border-gray-300`, etc.).
