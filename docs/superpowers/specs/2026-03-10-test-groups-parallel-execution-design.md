# Test Groups & Parallel Execution — Design Spec

## Overview

Add test grouping and parallel batch execution to the web QA automation tool. Users can organize tests into named groups with tags (e.g., "admin", "scheduling"), then run all tests in a group concurrently with configurable parallelism.

## Data Model

### TestGroup (new entity)

```ts
interface TestGroup {
  id: string;
  name: string;
  description?: string;
  testIds: string[];        // ordered array of test IDs
  tags: string[];            // group-level tags (e.g., "admin", "smoke")
  maxParallel: number;       // concurrency limit, default 3, min 1, max 10
  createdAt: string;
  updatedAt: string;
}
```

### GroupRun (new entity)

```ts
interface GroupRun {
  id: string;
  groupId: string;
  status: 'running' | 'passed' | 'failed' | 'partial' | 'cancelled';
  resultIds: string[];       // individual TestResult IDs
  startedAt: string;
  completedAt?: string;
  summary: {
    total: number;
    passed: number;
    failed: number;
    running: number;
  };
}
```

### TestResult (existing — add optional field)

```ts
groupRunId?: string;  // links result back to group run
```

### Storage

- `data/groups.json` — flat JSON file, same pattern as tests.json/results.json
- `data/group-runs.json` — flat JSON file for group run records

## Backend API

### Group CRUD — `/api/groups`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/groups | Create group |
| GET | /api/groups | List all groups |
| GET | /api/groups/:id | Get single group |
| PATCH | /api/groups/:id | Update group |
| DELETE | /api/groups/:id | Delete group + its group runs (individual TestResults and tests are NOT deleted) |

### Group Execution

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/groups/:id/execute | Run all tests in group |
| GET | /api/groups/:id/runs | List runs for a group |
| GET | /api/group-runs/:runId | Get single group run |

### Execution Flow (POST /api/groups/:id/execute)

1. Load group, validate all testIds exist
2. Create GroupRun with status 'running', summary { total: N, passed: 0, failed: 0, running: N }
3. For each test in testIds, queue execution into concurrency pool (size = maxParallel)
4. Each task calls existing executeTestAsync() logic, passing groupRunId to link the TestResult
5. As each test completes, update GroupRun summary (increment passed/failed, decrement running)
6. When all tests finish, set GroupRun.status: all passed → 'passed', all failed → 'failed', mixed → 'partial'
7. Set completedAt timestamp

### Concurrency Pool

```ts
async function executeWithConcurrencyLimit(
  tasks: (() => Promise<void>)[],
  maxParallel: number
): Promise<void> {
  const executing = new Set<Promise<void>>();
  for (const task of tasks) {
    const promise = task().then(() => executing.delete(promise));
    executing.add(promise);
    if (executing.size >= maxParallel) {
      await Promise.race(executing);
    }
  }
  await Promise.all(executing);
}
```

Each task wraps errors so individual failures don't abort the pool:
```ts
const promise = task().catch(() => {}).then(() => executing.delete(promise));
```

Each test gets its own AutomationService instance (own browser). Existing retry logic, prerequisite handling, and cached steps are preserved. No changes to AutomationService or ai.ts needed.

### Write Serialization (Race Condition Prevention)

The JSON-file database uses read-modify-write cycles. With parallel test execution, concurrent writes to `results.json` and `group-runs.json` would cause data loss. Solution: add a per-file promise-based write queue in `DatabaseService`. Each write operation chains onto the previous write's promise for the same file, ensuring serial writes without blocking reads. No external dependencies needed.

```ts
// In DatabaseService — one queue per file
private writeQueues: Map<string, Promise<void>> = new Map();

private async serializedWrite(filePath: string, writeFn: () => Promise<void>): Promise<void> {
  const previous = this.writeQueues.get(filePath) || Promise.resolve();
  const next = previous.then(writeFn, writeFn); // run even if previous failed
  this.writeQueues.set(filePath, next);
  return next;
}
```

### executeTestAsync Refactoring

The existing `executeTestAsync()` in `backend/src/routes/tests.ts` is a module-level function. To support group execution:
1. Extract it to `backend/src/services/testExecution.ts` as an exported function
2. Add optional `groupRunId` parameter to the signature
3. Pass `groupRunId` through to the `TestResult` when saving
4. The group execution endpoint passes `aiConfig` from the request body (same as the single-test endpoint)

## Frontend Architecture

Follows existing 3-layer pattern: Services → Stores → Views.

### Service Layer — `frontend/src/services/groupApi.ts`

Pure functions: getAll(), getById(), create(), update(), delete(), execute(), getRuns(), getRun()

### Store — `frontend/src/stores/groups.ts` (Pinia setup store)

- State: groups array, groupRuns array
- Loading flags: fetchingGroups, creatingGroup, executingGroupId (string|null), fetchingRuns
- Methods: fetchGroups(), createGroup(), updateGroup(), deleteGroup(), executeGroup(), fetchGroupRuns(), findGroup()

### Views & Components

**GroupsView.vue** — New top-level page at route `/groups`
- Lists all groups as cards: name, description, test count, tags, maxParallel
- Actions: Run, Edit, Delete
- Shows recent group runs with pass/fail summary

**GroupRunDetail.vue** — Route `/groups/:groupId/runs/:runId`
- Group run status, progress bar
- Table of individual test results with links to TestResultDetail

**CreateGroupModal.vue / EditGroupModal.vue**
- Test picker (searchable/filterable list of existing tests)
- Tag input, maxParallel number input

### TestsList.vue Integration

- Group filter dropdown: filters test list to show only tests in selected group
- "Run Group" quick-action button when group filter is active

### Navigation

- Add "Groups" link to nav alongside Dashboard, Tests, Results, Configuration

## Real-time Progress

Frontend polls GET /api/group-runs/:runId every 2 seconds to show live progress. Polling starts when a group execution is triggered and stops when `status !== 'running'`. GroupRun summary updates as each test completes in the backend.

## Startup Cleanup

On server start, mark any GroupRun records with status `'running'` as `'cancelled'` — these are stale from a previous server crash/restart.

## Key Decisions

- **Groups are first-class entities** — not tag-based filters. Explicit control over membership and order.
- **Configurable concurrency** (maxParallel) — prevents resource exhaustion, supports sequential (maxParallel=1) through fully parallel.
- **Individual TestResults preserved** — each test produces its own result. GroupRun is a lightweight wrapper linking them together.
- **No changes to AutomationService or AI service** — execution reuses existing single-test logic.
- **Playwright supports multiple concurrent browsers** — each chromium.launch() spawns a separate process, limited only by machine resources.
- **Write serialization** — per-file promise queue in DatabaseService prevents concurrent write race conditions.
- **executeTestAsync extracted** — moved from routes to a shared service so both single-test and group execution endpoints can use it.
- **maxParallel capped at 10** — validated in API and UI to prevent resource exhaustion.
- **Group-level tags vs test-level tags** — serve different purposes. Test tags categorize individual tests. Group tags categorize the group's purpose/context (e.g., "admin role", "smoke suite"). No auto-population between them.
- **Delete cascade** — deleting a group removes the group and its GroupRun records. Individual TestResults and tests remain untouched.
