# Device Emulation on Groups — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add device emulation to test groups so each test runs once per selected device, enabling cross-device testing with a single click.

**Architecture:** Add `devices: string[]` to TestGroup. At execution time, expand testIds × devices into the task matrix. AutomationService spreads `playwright.devices[name]` into `browser.newContext()`. Frontend gets a device picker in group modals and device badges in views.

**Tech Stack:** Playwright (device registry), Vue 3 + Pinia + Tailwind (frontend), Express + TypeScript (backend)

**Spec:** `docs/superpowers/specs/2026-03-11-device-emulation-design.md`

---

## File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `shared/types.ts` | Add `DeviceInfo`, `devices` to TestGroup, `device` to TestResult |
| Modify | `backend/src/services/automation.ts` | Accept optional `deviceName` in `initialize()` |
| Modify | `backend/src/services/testExecution.ts` | Pass `device` through to AutomationService and onto TestResult |
| Modify | `backend/src/routes/groups.ts` | Add `GET /api/groups/devices` endpoint; expand task matrix for devices |
| Modify | `frontend/src/services/groupApi.ts` | Add `getDevices()` method |
| Modify | `frontend/src/stores/groups.ts` | Add `devices` state + `fetchDevices()` action |
| Modify | `frontend/src/components/CreateGroupModal.vue` | Add device picker section |
| Modify | `frontend/src/components/EditGroupModal.vue` | Add device picker section |
| Modify | `frontend/src/views/GroupsView.vue` | Show device badges on group cards |
| Modify | `frontend/src/views/GroupRunDetail.vue` | Show device badge on result rows |

---

## Chunk 1: Backend — Types, Devices Endpoint, and Automation

### Task 1: Add shared types

**Files:**
- Modify: `shared/types.ts`

- [ ] **Step 1: Add `DeviceInfo` interface**

After the existing `GroupRunSummary` interface (~line 142), add:

```ts
export interface DeviceInfo {
  name: string
  viewport: { width: number; height: number }
  isMobile: boolean
}
```

- [ ] **Step 2: Add `devices` field to `TestGroup`**

In the `TestGroup` interface (~line 131), add after `maxParallel`:

```ts
devices: string[]  // e.g., ["iPhone 13", "Pixel 7"]. Empty = desktop only.
```

- [ ] **Step 3: Add `device` field to `TestResult`**

In the `TestResult` interface (~line 91), add after `groupRunId?`:

```ts
device?: string  // Device name used for emulation, undefined = desktop
```

- [ ] **Step 4: Verify TypeScript compiles**

Run from project root:
```bash
cd backend && npx tsc --noEmit
```
Expected: Compilation errors in files that create TestGroup objects without `devices` field. These will be fixed in subsequent tasks.

- [ ] **Step 5: Commit**

```bash
git add shared/types.ts
git commit -m "feat(types): add DeviceInfo, devices to TestGroup, device to TestResult"
```

---

### Task 2: GET /api/devices endpoint

**Files:**
- Modify: `backend/src/routes/groups.ts`

- [ ] **Step 1: Add device list and endpoint**

At the top of `backend/src/routes/groups.ts`, after existing imports, add:

```ts
import { devices as playwrightDevices } from 'playwright'
import type { DeviceInfo } from '@shared/types'
```

Then add this before the existing group CRUD routes (before `groupRouter.post('/', ...)`):

```ts
const CURATED_DEVICES = [
  'iPhone 15',
  'iPhone 14',
  'iPhone 13',
  'iPhone SE',
  'iPad Pro 11',
  'iPad Mini',
  'Pixel 7',
  'Pixel 5',
  'Galaxy S9+',
  'Galaxy Tab S4',
  'Desktop Chrome',
  'Desktop Safari',
  'Desktop Firefox',
]

groupRouter.get('/devices', (_req, res) => {
  const deviceList: DeviceInfo[] = CURATED_DEVICES
    .map(name => {
      const device = playwrightDevices[name]
      if (!device) return null
      return {
        name,
        viewport: device.viewport,
        isMobile: device.isMobile ?? false,
      }
    })
    .filter((d): d is DeviceInfo => d !== null)
  res.json(deviceList)
})
```

- [ ] **Step 2: Verify endpoint works**

Start the backend (`cd backend && npm run dev`), then:
```bash
curl http://localhost:8080/api/groups/devices
```
Expected: JSON array of 13 device objects with `name`, `viewport`, `isMobile`.

- [ ] **Step 3: Commit**

```bash
git add backend/src/routes/groups.ts
git commit -m "feat(api): add GET /api/groups/devices endpoint"
```

---

### Task 3: AutomationService — accept device in initialize()

**Files:**
- Modify: `backend/src/services/automation.ts`

- [ ] **Step 1: Import playwright devices registry**

At the top of `automation.ts`, add to existing playwright import:

```ts
import { chromium, devices as playwrightDevices } from 'playwright'
```

(If `chromium` is already imported separately, merge the import.)

- [ ] **Step 2: Modify initialize() signature and newContext() call**

Change the `initialize()` method (~line 30) from:

```ts
async initialize() {
```

to:

```ts
async initialize(deviceName?: string) {
```

Then modify the `browser.newContext()` call (~line 45). Currently it passes a hardcoded options object. Change it to:

```ts
const deviceDescriptor = deviceName ? playwrightDevices[deviceName] : undefined
if (deviceName && !deviceDescriptor) {
  logger.warn(`Unknown device "${deviceName}", proceeding without emulation`)
}

this.context = await this.browser.newContext({
  ...(deviceDescriptor || {}),
  // Keep existing options that aren't overridden by device
  acceptDownloads: false,
  ...(deviceDescriptor ? {} : {
    geolocation: { latitude: 0, longitude: 0 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  }),
})
```

The logic: if a device descriptor exists, spread it first (it includes viewport, userAgent, isMobile, hasTouch, deviceScaleFactor). Only apply the hardcoded geolocation/userAgent when there's no device emulation.

**Note:** Preserve whatever variable pattern the existing code uses (`const context = ...` vs `this.context = ...`). The snippet above uses `this.context` — adapt to match the actual code.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd backend && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add backend/src/services/automation.ts
git commit -m "feat(automation): accept optional deviceName in initialize()"
```

---

### Task 4: executeTestAsync — pass device through

**Files:**
- Modify: `backend/src/services/testExecution.ts`

- [ ] **Step 1: Add device parameter to function signature**

Change the signature (~line 9) from:

```ts
export async function executeTestAsync(
  test: TestRequest,
  aiConfig: any,
  resultId: string,
  groupRunId?: string
): Promise<void>
```

to:

```ts
export async function executeTestAsync(
  test: TestRequest,
  aiConfig: any,
  resultId: string,
  groupRunId?: string,
  device?: string
): Promise<void>
```

- [ ] **Step 2: Pass device to automation.initialize()**

Find the line where `automation.initialize()` is called (~line 52). Change:

```ts
await automation.initialize()
```

to:

```ts
await automation.initialize(device)
```

- [ ] **Step 3: Add device to both TestResult objects**

In the `updatedResult` object (~line 305-320), add `device` to the spread:

```ts
const updatedResult: TestResult = {
  id: resultId,
  testRequestId: test.id,
  status,
  steps: executedSteps,
  performance,
  screenshots,
  cost,
  executedAt: new Date(),
  completedAt: new Date(),
  consoleMessages,
  networkCalls,
  usedCachedSteps: usedCachedSteps,
  retryCount: retryCount,
  ...(groupRunId ? { groupRunId } : {}),
  ...(device ? { device } : {}),
}
```

**Also update the `errorResult` object** (~line 339 in the `catch` block) — add the same device spread:

```ts
...(device ? { device } : {}),
```

Both success and error paths must include the device so failed executions retain device attribution.

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd backend && npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/testExecution.ts
git commit -m "feat(execution): pass device through to automation and result"
```

---

### Task 5: Group execution — test × device matrix

**Files:**
- Modify: `backend/src/routes/groups.ts`

- [ ] **Step 1: Fix TestGroup creation to include devices**

Find all places in `groups.ts` where a new TestGroup is created (POST `/` handler). Add `devices` field:

In the POST handler, where the group object is built, add:

```ts
devices: Array.isArray(req.body.devices) ? req.body.devices : [],
```

Similarly in the PATCH handler, allow updating `devices`:

```ts
if (req.body.devices !== undefined) group.devices = req.body.devices
```

- [ ] **Step 2: Modify executeGroupAsync to expand device matrix**

Find the `executeGroupAsync` function (~line 34). It currently takes `(groupRunId, testIds, maxParallel, aiConfig)`.

Change signature to:

```ts
async function executeGroupAsync(
  groupRunId: string,
  testIds: string[],
  devices: string[],
  maxParallel: number,
  aiConfig: any
)
```

Replace the task-building logic. Currently it maps `testIds` to tasks. Change to:

```ts
// Build task matrix: testIds × devices (or just testIds if no devices)
interface Task { testId: string; device?: string }
const tasks: Task[] = []

if (devices.length > 0) {
  for (const testId of testIds) {
    for (const device of devices) {
      tasks.push({ testId, device })
    }
  }
} else {
  for (const testId of testIds) {
    tasks.push({ testId })
  }
}
```

Then update the task execution loop to use `task.testId` and `task.device`, passing `task.device` as the last argument to `executeTestAsync`:

```ts
const taskFns = tasks.map(task => async () => {
  const test = await db.getTest(task.testId)
  if (!test) {
    // handle missing test...
    return
  }
  const resultId = uuidv4()
  // ... existing result creation and group run update logic ...
  try {
    await executeTestAsync(test, aiConfig, resultId, groupRunId, task.device)
    // ... existing success handling ...
  } catch (err) {
    // ... existing error handling ...
  }
})
```

- [ ] **Step 3: Update GroupRun total to reflect matrix size**

In the POST `/:id/execute` handler, change the GroupRun creation:

```ts
const totalTasks = group.devices.length > 0
  ? group.testIds.length * group.devices.length
  : group.testIds.length

const groupRun: GroupRun = {
  id: uuidv4(),
  groupId: group.id,
  status: 'running',
  resultIds: [],
  startedAt: new Date().toISOString(),
  summary: {
    total: totalTasks,
    passed: 0,
    failed: 0,
    running: totalTasks,
  },
}
```

And pass `group.devices` to `executeGroupAsync`:

```ts
executeGroupAsync(groupRun.id, group.testIds, group.devices, group.maxParallel, aiConfig)
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd backend && npx tsc --noEmit
```

- [ ] **Step 5: Manual test — create a group with devices via curl**

```bash
# Create a group with devices
curl -X POST http://localhost:8080/api/groups \
  -H "Content-Type: application/json" \
  -d '{"name":"Device Test","testIds":["<some-test-id>"],"tags":[],"maxParallel":2,"devices":["iPhone 13","Desktop Chrome"]}'

# Execute it (with your AI config)
curl -X POST http://localhost:8080/api/groups/<group-id>/execute \
  -H "Content-Type: application/json" \
  -d '{"aiConfig":{"provider":"openai","apiKey":"...","model":"gpt-4o"}}'

# Check the group run — should show total = testIds × devices
curl http://localhost:8080/api/group-runs/<run-id>
```

- [ ] **Step 6: Commit**

```bash
git add backend/src/routes/groups.ts
git commit -m "feat(groups): expand test × device matrix in group execution"
```

---

## Chunk 2: Frontend — Service, Store, Modals, and Views

### Task 6: Frontend service + store — device fetching

**Files:**
- Modify: `frontend/src/services/groupApi.ts`
- Modify: `frontend/src/stores/groups.ts`

- [ ] **Step 1: Add getDevices() to groupApi**

In `frontend/src/services/groupApi.ts`, add the import and method:

Add `DeviceInfo` to the type import:

```ts
import type { TestGroup, GroupRun, DeviceInfo } from '@shared/types'
```

Add method to the `groupApi` object (after `getRun`):

```ts
getDevices() {
  return api.get<DeviceInfo[]>('/api/groups/devices')
},
```

Also update the `create` method's parameter type to include `devices`:

```ts
create(data: { name: string; description?: string; testIds: string[]; tags: string[]; maxParallel: number; devices?: string[] }) {
```

And update the `update` method so `devices` is included in `Partial<TestGroup>` (it already is since `TestGroup` now has `devices`, but verify the type flows through).

- [ ] **Step 2: Add devices state and fetchDevices to store**

In `frontend/src/stores/groups.ts`, add the import:

```ts
import type { TestGroup, GroupRun, DeviceInfo } from '@shared/types'
```

Add state inside the setup function:

```ts
const devices = ref<DeviceInfo[]>([])
```

Add the fetch action:

```ts
async function fetchDevices() {
  if (devices.value.length > 0) return // cached
  try {
    const { data } = await groupApi.getDevices()
    devices.value = data
  } catch (err: any) {
    console.error('Failed to fetch devices:', err.message)
  }
}
```

Add `devices` and `fetchDevices` to the store's return statement.

- [ ] **Step 3: Verify frontend compiles**

```bash
cd frontend && npx vue-tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/services/groupApi.ts frontend/src/stores/groups.ts
git commit -m "feat(frontend): add device fetching to groupApi and store"
```

---

### Task 7: CreateGroupModal — device picker

**Files:**
- Modify: `frontend/src/components/CreateGroupModal.vue`

- [ ] **Step 1: Add device state and import store**

In the `<script setup>` section, add to existing imports:

```ts
import { useGroupStore } from '@/stores/groups'
```

Add refs:

```ts
const groupStore = useGroupStore()
const selectedDevices = ref<string[]>([])
```

In the `resetForm()` function, add:

```ts
selectedDevices.value = []
```

In the `watch(() => props.isOpen, ...)` handler, inside the `if (isOpen)` block, add:

```ts
groupStore.fetchDevices()
```

- [ ] **Step 2: Add device picker template**

In the `<template>`, between the Test Picker section (ends ~line 94) and the Tags section (starts ~line 96), insert:

```html
<!-- Device Picker -->
<div>
  <label class="block text-sm font-medium text-heading mb-2">
    Devices <span class="text-secondary text-xs">(optional — {{ selectedDevices.length }} selected)</span>
  </label>
  <div class="border border-border rounded-card max-h-40 overflow-y-auto">
    <div v-if="groupStore.devices.length === 0" class="px-3 py-4 text-sm text-secondary text-center">
      Loading devices...
    </div>
    <label
      v-for="device in groupStore.devices"
      :key="device.name"
      class="flex items-center space-x-2 px-3 py-2 hover:bg-cream cursor-pointer border-b border-border last:border-0"
    >
      <input
        type="checkbox"
        :value="device.name"
        v-model="selectedDevices"
        class="rounded border-border text-primary focus:ring-primary/20"
      />
      <span class="text-sm text-heading flex-1">{{ device.name }}</span>
      <span class="text-xs text-secondary">
        {{ device.viewport.width }}×{{ device.viewport.height }}
        {{ device.isMobile ? '· Mobile' : '' }}
      </span>
    </label>
  </div>
</div>
```

- [ ] **Step 3: Pass devices in handleSubmit**

In `handleSubmit()`, add `devices` to the `createGroup` call:

```ts
const result = await groupStore.createGroup({
  name: form.value.name.trim(),
  description: form.value.description.trim() || undefined,
  testIds: selectedTestIds.value,
  tags: form.value.tags,
  maxParallel: form.value.maxParallel,
  devices: selectedDevices.value,
})
```

(The `groupApi.create` type was already updated in Task 6 to accept `devices`.)

- [ ] **Step 4: Verify it renders**

Start frontend (`cd frontend && npm run dev`), open Groups page, click "Create Group". The device picker should appear between the test picker and tags sections showing 13 devices with viewport sizes.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/CreateGroupModal.vue frontend/src/services/groupApi.ts
git commit -m "feat(frontend): add device picker to CreateGroupModal"
```

---

### Task 8: EditGroupModal — device picker

**Files:**
- Modify: `frontend/src/components/EditGroupModal.vue`

- [ ] **Step 1: Add device state**

In the `<script setup>` section, add:

```ts
const groupStore = useGroupStore()
const selectedDevices = ref<string[]>([])
```

(Note: `useGroupStore` is already imported in this file — just reference it.)

Wait — check the existing imports. The file imports `useGroupStore` already at line 169. So just add the ref:

```ts
const selectedDevices = ref<string[]>([])
```

In `populateFromGroup()`, add:

```ts
selectedDevices.value = [...(group.devices || [])]
```

In the `watch(() => props.isOpen, ...)` handler, inside the `if (isOpen)` block, add:

```ts
groupStore.fetchDevices()
```

- [ ] **Step 2: Add device picker template**

Same template block as CreateGroupModal (Step 2 of Task 7). Insert between Test Picker and Tags sections (~line 94-96).

- [ ] **Step 3: Pass devices in handleSubmit**

In `handleSubmit()`, add `devices` to the `updateGroup` call:

```ts
const result = await groupStore.updateGroup(props.group.id, {
  name: form.value.name.trim(),
  description: form.value.description.trim() || undefined,
  testIds: selectedTestIds.value,
  tags: form.value.tags,
  maxParallel: form.value.maxParallel,
  devices: selectedDevices.value,
})
```

- [ ] **Step 4: Verify it renders with pre-populated devices**

Open Groups page, edit an existing group. Device picker should show with previously selected devices checked.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/EditGroupModal.vue
git commit -m "feat(frontend): add device picker to EditGroupModal"
```

---

### Task 9: GroupsView — device badges on cards

**Files:**
- Modify: `frontend/src/views/GroupsView.vue`

- [ ] **Step 1: Add device badges to group cards**

In the group card template, find the test count badge (~line 57-60). After the test count `<span>`, add device badges:

```html
<div v-if="group.devices && group.devices.length > 0" class="flex flex-wrap gap-1 mt-1">
  <span
    v-for="device in group.devices"
    :key="device"
    class="inline-flex items-center px-1.5 py-0.5 text-xs bg-cream text-secondary rounded-pill border border-border"
  >
    {{ device }}
  </span>
</div>
```

Place this inside the card body area, after the tags section or alongside the test count — whichever fits the existing layout. The exact insertion point is after the existing tags display.

- [ ] **Step 2: Verify badges render**

Open Groups page. Groups with devices should show device name pills. Groups without devices should show no change.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/views/GroupsView.vue
git commit -m "feat(frontend): show device badges on group cards"
```

---

### Task 10: GroupRunDetail — device badge on result rows

**Files:**
- Modify: `frontend/src/views/GroupRunDetail.vue`

- [ ] **Step 1: Add device badge to result rows**

In the result row template (~lines 116-149), find the right-side flex container that shows the status badge. After the status badge `<span>`, add:

```html
<span
  v-if="getResult(resultId)?.device"
  class="inline-flex items-center px-1.5 py-0.5 text-xs bg-cream text-secondary rounded-pill border border-border"
>
  {{ getResult(resultId)?.device }}
</span>
```

If `getResult` is not an existing helper, check how results are accessed in this view. The view likely stores results in a map or fetches them. Add the device badge using whatever pattern is already used to display test names.

- [ ] **Step 2: Verify badge renders**

Execute a group with devices. Open the GroupRunDetail. Each result row should show a device pill next to the status badge. Results without a device (desktop) show no badge.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/views/GroupRunDetail.vue
git commit -m "feat(frontend): show device badge on group run result rows"
```

---

### Task 11: Final verification and CLAUDE.md update

**Files:**
- Modify: `.claude/CLAUDE.md`

- [ ] **Step 1: End-to-end test**

1. Create a group with 2 tests and 2 devices (e.g., iPhone 13, Desktop Chrome)
2. Run the group
3. Verify GroupRun shows `total: 4` (2 tests × 2 devices)
4. Verify each result row shows the correct device badge
5. Verify a group with no devices still works as before (total = test count)

- [ ] **Step 2: Update CLAUDE.md**

Add `device?: string` to the TestResult fields description. Update the TestGroup description to mention `devices: string[]`. Add a note about device emulation under Architecture Decisions:

```
- Device emulation uses `playwright.devices` registry. `AutomationService.initialize(deviceName?)` spreads device descriptors into `browser.newContext()`. Groups with `devices: string[]` create a test × device execution matrix.
```

Update the `GET /api/devices` endpoint in the routes section.

- [ ] **Step 3: Commit**

```bash
git add .claude/CLAUDE.md
git commit -m "docs: update CLAUDE.md with device emulation feature"
```
