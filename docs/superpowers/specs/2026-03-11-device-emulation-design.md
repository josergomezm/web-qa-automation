# Device Emulation on Groups — Design Spec

## Overview

Add device emulation support to test groups. When a group has devices configured, each test in the group runs once per device, enabling cross-device testing with a single click.

## Data Model

All type changes go in `shared/types.ts` (imported as `@shared/types`).

### TestGroup (modify — add field)

```ts
devices: string[]  // e.g., ["iPhone 13", "Pixel 7"]. Empty = desktop only (default).
```

### TestResult (modify — add field)

```ts
device?: string  // Device name used for this execution, undefined = desktop
```

Existing results without `device` display as desktop (no migration needed).

### DeviceInfo (new type)

```ts
export interface DeviceInfo {
  name: string
  viewport: { width: number; height: number }
  isMobile: boolean
}
```

### GroupRun (no changes)

The existing `summary.total` reflects the full matrix (tests × devices). No structural changes needed.

## Curated Device List

Defined server-side, served via `GET /api/groups/devices`. All names verified against `playwright.devices` registry:

- iPhone 15
- iPhone 14
- iPhone 13
- iPhone SE
- iPad Pro 11
- iPad Mini
- Pixel 7
- Pixel 5
- Galaxy S9+
- Galaxy Tab S4
- Desktop Chrome
- Desktop Safari
- Desktop Firefox

The endpoint returns `DeviceInfo[]` for UI display.

## Backend Changes

### AutomationService.initialize() — accept optional device

File: `backend/src/services/automation.ts`

Current signature: `async initialize()`

New signature: `async initialize(deviceName?: string)`

If `deviceName` is provided, look up `playwright.devices[deviceName]` and spread it into the `browser.newContext()` options. This sets viewport, userAgent, hasTouch, isMobile, deviceScaleFactor automatically. If the key is not found in `playwright.devices`, log a warning and proceed without emulation (graceful fallback).

### executeTestAsync — pass device through

File: `backend/src/services/testExecution.ts`

Add optional `device?: string` parameter. Pass it to `AutomationService.initialize(device)`. Set `result.device = device` on the TestResult before saving.

### Group execution — test × device matrix

File: `backend/src/routes/groups.ts`

Current: one task per test in `testIds`.

New: if `group.devices.length > 0`, create one task per (test, device) combination. If `group.devices` is empty, behavior is unchanged (one task per test, no device emulation).

```
total tasks = devices.length > 0
  ? testIds.length × devices.length
  : testIds.length
```

`GroupRun.summary.total` reflects this expanded count. All tasks go through the same `maxParallel` concurrency pool.

### GET /api/devices — new endpoint

File: `backend/src/routes/groups.ts` (added to existing groups router)

Returns the curated device list as `DeviceInfo[]`. Reads viewport/isMobile from `playwright.devices` at request time.

## Frontend Changes

### Service layer

File: `frontend/src/services/groupApi.ts` — add `getDevices()` method to the existing `groupApi` object. Returns `DeviceInfo[]`.

### Store layer

`useGroupStore` — add `devices: ref<DeviceInfo[]>([])` and `fetchDevices()` action. Devices are fetched once when a group modal opens and cached.

### CreateGroupModal / EditGroupModal

Add a device picker section below the test picker. Same checkbox pattern. Shows device name + viewport dimensions. Multi-select.

### GroupsView cards

Show device badges (small pills) on group cards if `devices.length > 0`.

### GroupRunDetail

Add a device badge next to each test result row. Shows the device name for that execution. Results without `device` field show no badge (desktop).

## Key Decisions

- Devices live on TestGroup only, not on individual TestRequest. Tests are device-agnostic.
- Empty `devices` array = desktop default (backward compatible, no behavior change for existing groups).
- Device list is curated (~13 devices) and served from the backend to keep it DRY.
- Execution multiplies tests × devices. maxParallel governs total concurrency across all combinations.
- TestResult.device tracks which device was used, for display in results.
- Invalid device names at execution time: log warning, skip emulation (don't fail the test).
- Screenshots reflect the emulated viewport automatically (Playwright handles this).
