# Test Groups & Parallel Execution — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add test grouping with configurable parallel batch execution to the web QA automation tool.

**Architecture:** New `TestGroup` and `GroupRun` entities stored as JSON files. A concurrency-limited execution pool launches multiple browser instances. Frontend follows the existing 3-layer pattern (services → stores → views).

**Tech Stack:** Vue 3 + TypeScript + Pinia + Tailwind (frontend), Express + Playwright (backend), shared types.

**Spec:** `docs/superpowers/specs/2026-03-10-test-groups-parallel-execution-design.md`

---

## File Structure

### New Files
- `shared/types.ts` — modify: add TestGroup, GroupRun interfaces, groupRunId to TestResult
- `backend/src/services/testExecution.ts` — create: extracted executeTestAsync from routes
- `backend/src/routes/groups.ts` — create: group CRUD + execution endpoints
- `frontend/src/services/groupApi.ts` — create: group API wrapper
- `frontend/src/stores/groups.ts` — create: Pinia group store
- `frontend/src/views/GroupsView.vue` — create: groups list page
- `frontend/src/views/GroupRunDetail.vue` — create: group run detail page
- `frontend/src/components/CreateGroupModal.vue` — create: group creation modal
- `frontend/src/components/EditGroupModal.vue` — create: group edit modal

### Modified Files
- `backend/src/services/database.ts` — add write serialization + group/groupRun CRUD methods
- `backend/src/routes/tests.ts` — import extracted executeTestAsync
- `backend/src/index.ts` — mount group routes + startup cleanup
- `frontend/src/main.ts` — add group routes
- `frontend/src/App.vue` — add Groups nav link
- `frontend/src/views/TestsList.vue` — add group filter dropdown + Run Group button

---

## Chunk 1: Backend Foundation (Types, Database, Execution Extraction)

### Task 1: Add shared types

**Files:**
- Modify: `shared/types.ts:91-109` (TestResult interface), append new interfaces

- [ ] **Step 1: Add TestGroup interface to shared/types.ts**

After the existing `TestReport` interface (line 127), add:

```ts
// Test Groups
export interface TestGroup {
  id: string;
  name: string;
  description?: string;
  testIds: string[];
  tags: string[];
  maxParallel: number;
  createdAt: string;
  updatedAt: string;
}

export interface GroupRunSummary {
  total: number;
  passed: number;
  failed: number;
  running: number;
}

export interface GroupRun {
  id: string;
  groupId: string;
  status: 'running' | 'passed' | 'failed' | 'partial' | 'cancelled';
  resultIds: string[];
  startedAt: string;
  completedAt?: string;
  summary: GroupRunSummary;
}
```

- [ ] **Step 2: Add groupRunId to TestResult**

In the `TestResult` interface (around line 109), add before the closing brace:

```ts
  groupRunId?: string;
```

- [ ] **Step 3: Commit**

```bash
git add shared/types.ts
git commit -m "feat: add TestGroup, GroupRun types and groupRunId to TestResult"
```

---

### Task 2: Add write serialization to DatabaseService

**Files:**
- Modify: `backend/src/services/database.ts`

- [ ] **Step 1: Add write queue mechanism**

In `DatabaseService` class, after the existing private properties (around line 8), add:

```ts
  private writeQueues: Map<string, Promise<void>> = new Map();

  private async serializedWrite(filePath: string, writeFn: () => Promise<void>): Promise<void> {
    const previous = this.writeQueues.get(filePath) || Promise.resolve();
    const next = previous.then(writeFn, writeFn);
    this.writeQueues.set(filePath, next);
    return next;
  }
```

- [ ] **Step 2: Update writeJsonFile to use serialized writes**

Replace the existing `writeJsonFile` method (line 34-36):

```ts
  private async writeJsonFile<T>(filePath: string, data: T[]): Promise<void> {
    await this.serializedWrite(filePath, async () => {
      await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    });
  }
```

- [ ] **Step 3: Verify backend still starts and existing tests work**

Run: `cd backend && npx ts-node-dev src/index.ts`
Expected: Server starts on port 8080 without errors.

- [ ] **Step 4: Commit**

```bash
git add backend/src/services/database.ts
git commit -m "feat: add write serialization to DatabaseService for concurrent safety"
```

---

### Task 3: Add group and group-run database methods

**Files:**
- Modify: `backend/src/services/database.ts`

- [ ] **Step 1: Add file paths for groups and group runs**

In the constructor (lines 10-15), after `this.resultsFile`, add:

```ts
    this.groupsFile = path.join(this.dataDir, 'groups.json');
    this.groupRunsFile = path.join(this.dataDir, 'group-runs.json');
```

Add the corresponding private property declarations alongside `testsFile` and `resultsFile`:

```ts
  private groupsFile: string;
  private groupRunsFile: string;
```

- [ ] **Step 2: Add group CRUD methods**

After the existing test methods, add:

```ts
  // Group operations
  async saveGroup(group: TestGroup): Promise<void> {
    await this.ensureDataDir();
    const groups = await this.readJsonFile<TestGroup>(this.groupsFile);
    const index = groups.findIndex(g => g.id === group.id);
    if (index >= 0) {
      groups[index] = group;
    } else {
      groups.push(group);
    }
    await this.writeJsonFile(this.groupsFile, groups);
  }

  async getGroup(id: string): Promise<TestGroup | null> {
    const groups = await this.readJsonFile<TestGroup>(this.groupsFile);
    return groups.find(g => g.id === id) || null;
  }

  async getAllGroups(): Promise<TestGroup[]> {
    return this.readJsonFile<TestGroup>(this.groupsFile);
  }

  async deleteGroup(id: string): Promise<void> {
    await this.ensureDataDir();
    const groups = await this.readJsonFile<TestGroup>(this.groupsFile);
    const filtered = groups.filter(g => g.id !== id);
    await this.writeJsonFile(this.groupsFile, filtered);
  }
```

- [ ] **Step 3: Add group run methods**

```ts
  // Group Run operations
  async saveGroupRun(groupRun: GroupRun): Promise<void> {
    await this.ensureDataDir();
    const runs = await this.readJsonFile<GroupRun>(this.groupRunsFile);
    const index = runs.findIndex(r => r.id === groupRun.id);
    if (index >= 0) {
      runs[index] = groupRun;
    } else {
      runs.push(groupRun);
    }
    await this.writeJsonFile(this.groupRunsFile, runs);
  }

  async getGroupRun(id: string): Promise<GroupRun | null> {
    const runs = await this.readJsonFile<GroupRun>(this.groupRunsFile);
    return runs.find(r => r.id === id) || null;
  }

  async getGroupRunsByGroupId(groupId: string): Promise<GroupRun[]> {
    const runs = await this.readJsonFile<GroupRun>(this.groupRunsFile);
    return runs.filter(r => r.groupId === groupId);
  }

  async deleteGroupRunsByGroupId(groupId: string): Promise<void> {
    await this.ensureDataDir();
    const runs = await this.readJsonFile<GroupRun>(this.groupRunsFile);
    const filtered = runs.filter(r => r.groupId !== groupId);
    await this.writeJsonFile(this.groupRunsFile, filtered);
  }

  async cancelStaleGroupRuns(): Promise<void> {
    await this.ensureDataDir();
    const runs = await this.readJsonFile<GroupRun>(this.groupRunsFile);
    let changed = false;
    for (const run of runs) {
      if (run.status === 'running') {
        run.status = 'cancelled';
        run.completedAt = new Date().toISOString();
        changed = true;
      }
    }
    if (changed) {
      await this.writeJsonFile(this.groupRunsFile, runs);
    }
  }
```

- [ ] **Step 4: Add imports for new types**

At the top of `database.ts`, update the import from `@shared/types` to include `TestGroup` and `GroupRun`.

- [ ] **Step 5: Verify backend starts**

Run: `cd backend && npx ts-node-dev src/index.ts`
Expected: Server starts without errors.

- [ ] **Step 6: Commit**

```bash
git add backend/src/services/database.ts
git commit -m "feat: add group and group-run database methods"
```

---

### Task 4: Extract executeTestAsync to a shared service

**Files:**
- Create: `backend/src/services/testExecution.ts`
- Modify: `backend/src/routes/tests.ts:112-454`

- [ ] **Step 1: Create testExecution.ts**

Create `backend/src/services/testExecution.ts`. Move the `executeTestAsync` function (lines 112-454 from `backend/src/routes/tests.ts`) into this new file as an exported function.

Update the signature to accept an optional `groupRunId`:

```ts
import { v4 as uuidv4 } from 'uuid';
import { AIService } from './ai';
import { AutomationService } from './automation';
import { DatabaseService } from './database';
import { logger } from '../utils/logger';
import { TestRequest, TestResult } from '@shared/types';

const db = new DatabaseService();

export async function executeTestAsync(
  test: TestRequest,
  aiConfig: any,
  resultId: string,
  groupRunId?: string
): Promise<void> {
  // ... (entire body from routes/tests.ts lines 113-454)
  // At the point where the initial result is created/updated,
  // add groupRunId to the TestResult object if provided.
}
```

Key modifications inside the function:
- Where the result object is first loaded/updated (around the `onStepUpdate` helper), ensure `groupRunId` is set on the result if provided:
  ```ts
  if (groupRunId) {
    result.groupRunId = groupRunId;
    await db.saveResult(result);
  }
  ```
- **IMPORTANT:** There are TWO places where `TestResult` is constructed/saved in the original function: the success path (around line 394) and the error path (around line 427). Add `groupRunId` to BOTH result objects.

- [ ] **Step 2: Update routes/tests.ts to import from testExecution.ts**

In `backend/src/routes/tests.ts`:
1. Remove the `executeTestAsync` function body (lines 112-454)
2. Add import: `import { executeTestAsync } from '../services/testExecution';`
3. The execute endpoint handler (lines 54-110) stays in the routes file — it just calls the imported function now.

- [ ] **Step 3: Verify the existing execute endpoint still works**

Run: `cd backend && npx ts-node-dev src/index.ts`
Expected: Server starts. The `POST /api/tests/:id/execute` endpoint should work identically.

- [ ] **Step 4: Commit**

```bash
git add backend/src/services/testExecution.ts backend/src/routes/tests.ts
git commit -m "refactor: extract executeTestAsync to shared testExecution service"
```

---

### Task 5: Create group routes

**Files:**
- Create: `backend/src/routes/groups.ts`
- Modify: `backend/src/index.ts`

- [ ] **Step 1: Create groups.ts router with CRUD endpoints**

Create `backend/src/routes/groups.ts`:

```ts
import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseService } from '../services/database';
import { executeTestAsync } from '../services/testExecution';
import { logger } from '../utils/logger';
import { TestGroup, GroupRun } from '@shared/types';

const router = Router();
const db = new DatabaseService();

// Create group
router.post('/', async (req, res) => {
  try {
    const { name, description, testIds, tags, maxParallel } = req.body;

    if (!name || !testIds || !Array.isArray(testIds) || testIds.length === 0) {
      return res.status(400).json({ error: 'name and testIds (non-empty array) are required' });
    }

    // Validate all testIds exist
    for (const testId of testIds) {
      const test = await db.getTest(testId);
      if (!test) {
        return res.status(400).json({ error: `Test with id ${testId} not found` });
      }
    }

    const group: TestGroup = {
      id: uuidv4(),
      name,
      description: description || undefined,
      testIds,
      tags: tags || [],
      maxParallel: Math.min(Math.max(maxParallel || 3, 1), 10),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.saveGroup(group);
    logger.info(`Group created: ${group.id} - ${group.name}`);
    res.status(201).json(group);
  } catch (error: any) {
    logger.error('Error creating group:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all groups
router.get('/', async (_req, res) => {
  try {
    const groups = await db.getAllGroups();
    res.json(groups);
  } catch (error: any) {
    logger.error('Error fetching groups:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single group
router.get('/:id', async (req, res) => {
  try {
    const group = await db.getGroup(req.params.id);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }
    res.json(group);
  } catch (error: any) {
    logger.error('Error fetching group:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update group
router.patch('/:id', async (req, res) => {
  try {
    const group = await db.getGroup(req.params.id);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const { name, description, testIds, tags, maxParallel } = req.body;

    if (testIds !== undefined) {
      if (!Array.isArray(testIds) || testIds.length === 0) {
        return res.status(400).json({ error: 'testIds must be a non-empty array' });
      }
      for (const testId of testIds) {
        const test = await db.getTest(testId);
        if (!test) {
          return res.status(400).json({ error: `Test with id ${testId} not found` });
        }
      }
      group.testIds = testIds;
    }

    if (name !== undefined) group.name = name;
    if (description !== undefined) group.description = description;
    if (tags !== undefined) group.tags = tags;
    if (maxParallel !== undefined) {
      group.maxParallel = Math.min(Math.max(maxParallel, 1), 10);
    }
    group.updatedAt = new Date().toISOString();

    await db.saveGroup(group);
    logger.info(`Group updated: ${group.id}`);
    res.json(group);
  } catch (error: any) {
    logger.error('Error updating group:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete group (+ its group runs, but NOT individual test results)
router.delete('/:id', async (req, res) => {
  try {
    const group = await db.getGroup(req.params.id);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }
    await db.deleteGroupRunsByGroupId(group.id);
    await db.deleteGroup(group.id);
    logger.info(`Group deleted: ${group.id}`);
    res.json({ message: 'Group deleted' });
  } catch (error: any) {
    logger.error('Error deleting group:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get runs for a group
router.get('/:id/runs', async (req, res) => {
  try {
    const group = await db.getGroup(req.params.id);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }
    const runs = await db.getGroupRunsByGroupId(group.id);
    res.json(runs);
  } catch (error: any) {
    logger.error('Error fetching group runs:', error);
    res.status(500).json({ error: error.message });
  }
});

// Execute group
router.post('/:id/execute', async (req, res) => {
  try {
    const group = await db.getGroup(req.params.id);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const { aiConfig } = req.body;
    if (!aiConfig) {
      return res.status(400).json({ error: 'aiConfig is required' });
    }

    // Validate all tests still exist
    const tests = [];
    for (const testId of group.testIds) {
      const test = await db.getTest(testId);
      if (!test) {
        return res.status(400).json({ error: `Test ${testId} no longer exists` });
      }
      tests.push(test);
    }

    // Create GroupRun
    const groupRun: GroupRun = {
      id: uuidv4(),
      groupId: group.id,
      status: 'running',
      resultIds: [],
      startedAt: new Date().toISOString(),
      summary: {
        total: tests.length,
        passed: 0,
        failed: 0,
        running: tests.length,
      },
    };
    await db.saveGroupRun(groupRun);

    // Launch execution in background (don't await)
    executeGroupAsync(group, groupRun, tests, aiConfig);

    logger.info(`Group execution started: ${groupRun.id} for group ${group.id}`);
    res.status(202).json(groupRun);
  } catch (error: any) {
    logger.error('Error executing group:', error);
    res.status(500).json({ error: error.message });
  }
});

async function executeWithConcurrencyLimit(
  tasks: (() => Promise<void>)[],
  maxParallel: number
): Promise<void> {
  const executing = new Set<Promise<void>>();
  for (const task of tasks) {
    const promise = task().catch(() => {}).then(() => { executing.delete(promise); });
    executing.add(promise);
    if (executing.size >= maxParallel) {
      await Promise.race(executing);
    }
  }
  await Promise.all(executing);
}

async function executeGroupAsync(
  group: TestGroup,
  groupRun: GroupRun,
  tests: any[],
  aiConfig: any
): Promise<void> {
  try {
    const tasks = tests.map((test) => async () => {
      const resultId = uuidv4();

      // Create initial TestResult
      const initialResult = {
        id: resultId,
        testRequestId: test.id,
        status: 'running' as const,
        steps: [],
        performance: {
          pageLoadTime: 0,
          totalTestTime: 0,
          clickCount: 0,
          networkRequests: 0,
          consoleErrors: [],
          consoleWarnings: [],
        },
        screenshots: [],
        cost: 0,
        executedAt: new Date(),
        consoleMessages: [],
        networkCalls: [],
        groupRunId: groupRun.id,
      };
      await db.saveResult(initialResult as any);

      // Track the resultId — re-read from DB to avoid stale data with concurrent tasks
      const currentRun = await db.getGroupRun(groupRun.id);
      if (currentRun) {
        currentRun.resultIds.push(resultId);
        await db.saveGroupRun(currentRun);
      }

      try {
        await executeTestAsync(test, aiConfig, resultId, groupRun.id);

        // Re-read GroupRun from DB before mutating (avoid race conditions)
        const result = await db.getResult(resultId);
        const runAfterExec = await db.getGroupRun(groupRun.id);
        if (runAfterExec) {
          if (result && result.status === 'passed') {
            runAfterExec.summary.passed++;
          } else {
            runAfterExec.summary.failed++;
          }
          runAfterExec.summary.running--;
          await db.saveGroupRun(runAfterExec);
        }
      } catch (error) {
        const runAfterErr = await db.getGroupRun(groupRun.id);
        if (runAfterErr) {
          runAfterErr.summary.failed++;
          runAfterErr.summary.running--;
          await db.saveGroupRun(runAfterErr);
        }
        logger.error(`Group run ${groupRun.id}: test ${test.id} failed with error`, error);
      }
    });

    await executeWithConcurrencyLimit(tasks, group.maxParallel);

    // Re-read final state and determine status
    const finalRun = await db.getGroupRun(groupRun.id);
    if (finalRun) {
      if (finalRun.summary.failed === 0) {
        finalRun.status = 'passed';
      } else if (finalRun.summary.passed === 0) {
        finalRun.status = 'failed';
      } else {
        finalRun.status = 'partial';
      }
      finalRun.completedAt = new Date().toISOString();
      await db.saveGroupRun(finalRun);
    }

    logger.info(`Group run completed: ${groupRun.id} - ${groupRun.status}`);
  } catch (error) {
    groupRun.status = 'failed';
    groupRun.completedAt = new Date().toISOString();
    await db.saveGroupRun(groupRun);
    logger.error(`Group run failed: ${groupRun.id}`, error);
  }
}

export default router;
```

- [ ] **Step 2: Add group-run detail endpoint**

This endpoint is at a different base path (`/api/group-runs`), so add a second router export from the same file. At the bottom of `groups.ts`, before `export default router;`:

```ts
export const groupRunRouter = Router();

// Get single group run
groupRunRouter.get('/:runId', async (req, res) => {
  try {
    const run = await db.getGroupRun(req.params.runId);
    if (!run) {
      return res.status(404).json({ error: 'Group run not found' });
    }
    res.json(run);
  } catch (error: any) {
    logger.error('Error fetching group run:', error);
    res.status(500).json({ error: error.message });
  }
});
```

Update the default export to be named: `export { router as groupRouter };`

- [ ] **Step 3: Mount routes and add startup cleanup in index.ts**

In `backend/src/index.ts` (29 lines):

Add import:
```ts
import { groupRouter, groupRunRouter } from './routes/groups';
import { DatabaseService } from './services/database';
```

After existing route mounts (line 16), add:
```ts
app.use('/api/groups', groupRouter);
app.use('/api/group-runs', groupRunRouter);
```

Before `app.listen()` (line 24), add startup cleanup:
```ts
// Cancel stale group runs from previous server crashes
const db = new DatabaseService();
db.cancelStaleGroupRuns().catch(err => {
  console.error('Failed to cancel stale group runs:', err);
});
```

- [ ] **Step 4: Verify backend starts and CRUD endpoints respond**

Run: `cd backend && npx ts-node-dev src/index.ts`
Expected: Server starts on port 8080. Test with:
```bash
curl http://localhost:8080/api/groups
# Expected: [] (empty array)
```

- [ ] **Step 5: Commit**

```bash
git add backend/src/routes/groups.ts backend/src/index.ts
git commit -m "feat: add group CRUD and parallel execution endpoints"
```

---

## Chunk 2: Frontend (Services, Store, Views)

### Task 6: Create group API service

**Files:**
- Create: `frontend/src/services/groupApi.ts`

- [ ] **Step 1: Create groupApi.ts**

Following the pattern in `frontend/src/services/testApi.ts`:

```ts
import api from './api'
import type { TestGroup, GroupRun } from '@shared/types'

export const groupApi = {
  getAll() {
    return api.get<TestGroup[]>('/api/groups')
  },

  getById(id: string) {
    return api.get<TestGroup>(`/api/groups/${id}`)
  },

  create(data: { name: string; description?: string; testIds: string[]; tags: string[]; maxParallel: number }) {
    return api.post<TestGroup>('/api/groups', data)
  },

  update(id: string, data: Partial<TestGroup>) {
    return api.patch<TestGroup>(`/api/groups/${id}`, data)
  },

  remove(id: string) {
    return api.delete(`/api/groups/${id}`)
  },

  execute(id: string, aiConfig: any) {
    return api.post<GroupRun>(`/api/groups/${id}/execute`, { aiConfig })
  },

  getRuns(groupId: string) {
    return api.get<GroupRun[]>(`/api/groups/${groupId}/runs`)
  },

  getRun(runId: string) {
    return api.get<GroupRun>(`/api/group-runs/${runId}`)
  },
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/services/groupApi.ts
git commit -m "feat: add group API service layer"
```

---

### Task 7: Create group Pinia store

**Files:**
- Create: `frontend/src/stores/groups.ts`

- [ ] **Step 1: Create groups.ts store**

Following the pattern in `frontend/src/stores/tests.ts`:

```ts
import { ref } from 'vue'
import { defineStore } from 'pinia'
import { groupApi } from '../services/groupApi'
import type { TestGroup, GroupRun } from '@shared/types'

export const useGroupStore = defineStore('groups', () => {
  const groups = ref<TestGroup[]>([]);
  const groupRuns = ref<GroupRun[]>([]);

  // Per-action loading flags
  const fetchingGroups = ref(false);
  const creatingGroup = ref(false);
  const executingGroupId = ref<string | null>(null);
  const fetchingRuns = ref(false);

  const error = ref<string | null>(null);

  function clearError() {
    error.value = null;
  }

  function findGroup(id: string): TestGroup | undefined {
    return groups.value.find(g => g.id === id);
  }

  async function fetchGroups() {
    fetchingGroups.value = true;
    error.value = null;
    try {
      groups.value = await groupApi.getAll();
    } catch (err: any) {
      error.value = err.response?.data?.error || err.message || 'Failed to fetch groups';
    } finally {
      fetchingGroups.value = false;
    }
  }

  async function createGroup(data: {
    name: string;
    description?: string;
    testIds: string[];
    tags: string[];
    maxParallel: number;
  }): Promise<TestGroup | null> {
    creatingGroup.value = true;
    error.value = null;
    try {
      const group = await groupApi.create(data);
      groups.value.push(group);
      return group;
    } catch (err: any) {
      error.value = err.response?.data?.error || err.message || 'Failed to create group';
      return null;
    } finally {
      creatingGroup.value = false;
    }
  }

  async function updateGroup(id: string, data: Partial<TestGroup>): Promise<TestGroup | null> {
    error.value = null;
    try {
      const updated = await groupApi.update(id, data);
      const index = groups.value.findIndex(g => g.id === id);
      if (index >= 0) groups.value[index] = updated;
      return updated;
    } catch (err: any) {
      error.value = err.response?.data?.error || err.message || 'Failed to update group';
      return null;
    }
  }

  async function deleteGroup(id: string): Promise<boolean> {
    error.value = null;
    try {
      await groupApi.remove(id);
      groups.value = groups.value.filter(g => g.id !== id);
      return true;
    } catch (err: any) {
      error.value = err.response?.data?.error || err.message || 'Failed to delete group';
      return false;
    }
  }

  async function executeGroup(id: string, aiConfig: any): Promise<GroupRun | null> {
    executingGroupId.value = id;
    error.value = null;
    try {
      const run = await groupApi.execute(id, aiConfig);
      groupRuns.value.push(run);
      return run;
    } catch (err: any) {
      error.value = err.response?.data?.error || err.message || 'Failed to execute group';
      return null;
    } finally {
      executingGroupId.value = null;
    }
  }

  async function fetchGroupRuns(groupId: string) {
    fetchingRuns.value = true;
    error.value = null;
    try {
      const runs = await groupApi.getRuns(groupId);
      // Merge: remove old runs for this group, add fresh ones
      groupRuns.value = [
        ...groupRuns.value.filter(r => r.groupId !== groupId),
        ...runs,
      ];
    } catch (err: any) {
      error.value = err.response?.data?.error || err.message || 'Failed to fetch group runs';
    } finally {
      fetchingRuns.value = false;
    }
  }

  async function fetchGroupRun(runId: string): Promise<GroupRun | null> {
    try {
      return await groupApi.getRun(runId);
    } catch (err: any) {
      error.value = err.response?.data?.error || err.message || 'Failed to fetch group run';
      return null;
    }
  }

  return {
    // State
    groups,
    groupRuns,
    fetchingGroups,
    creatingGroup,
    executingGroupId,
    fetchingRuns,
    error,
    // Actions
    clearError,
    findGroup,
    fetchGroups,
    createGroup,
    updateGroup,
    deleteGroup,
    executeGroup,
    fetchGroupRuns,
    fetchGroupRun,
  };
});
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/stores/groups.ts
git commit -m "feat: add Pinia group store with per-action loading flags"
```

---

### Task 8: Create GroupsView page

**Files:**
- Create: `frontend/src/views/GroupsView.vue`
- Modify: `frontend/src/main.ts` (add route)
- Modify: `frontend/src/App.vue` (add nav link)

- [ ] **Step 1: Create GroupsView.vue**

This view lists all groups as cards with actions. Use Tailwind classes consistent with `TestsList.vue`.

```vue
<template>
  <div class="max-w-7xl mx-auto px-4 py-6">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Test Groups</h1>
      <button
        @click="showCreateModal = true"
        class="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
      >
        Create Group
      </button>
    </div>

    <!-- Error -->
    <div v-if="groupStore.error" class="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">
      {{ groupStore.error }}
    </div>

    <!-- Loading -->
    <div v-if="groupStore.fetchingGroups" class="flex justify-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
    </div>

    <!-- Empty state -->
    <div v-else-if="groupStore.groups.length === 0" class="text-center py-12 text-gray-500 dark:text-gray-400">
      <p class="text-lg">No groups yet.</p>
      <p class="mt-2">Create a group to organize and batch-run your tests.</p>
    </div>

    <!-- Group cards -->
    <div v-else class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <div
        v-for="group in groupStore.groups"
        :key="group.id"
        class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5"
      >
        <div class="flex items-start justify-between mb-3">
          <div>
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">{{ group.name }}</h3>
            <p v-if="group.description" class="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {{ group.description }}
            </p>
          </div>
          <span class="text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded">
            {{ group.testIds.length }} tests
          </span>
        </div>

        <!-- Tags -->
        <div v-if="group.tags.length > 0" class="flex flex-wrap gap-1 mb-3">
          <span
            v-for="tag in group.tags"
            :key="tag"
            class="text-xs bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 px-2 py-0.5 rounded-full"
          >
            {{ tag }}
          </span>
        </div>

        <!-- Config -->
        <div class="text-xs text-gray-500 dark:text-gray-400 mb-4">
          Max parallel: {{ group.maxParallel }}
        </div>

        <!-- Test names preview -->
        <div class="mb-4">
          <div
            v-for="testId in group.testIds.slice(0, 3)"
            :key="testId"
            class="text-sm text-gray-600 dark:text-gray-300 truncate"
          >
            {{ getTestName(testId) }}
          </div>
          <div v-if="group.testIds.length > 3" class="text-xs text-gray-400 mt-1">
            +{{ group.testIds.length - 3 }} more
          </div>
        </div>

        <!-- Actions -->
        <div class="flex gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
          <button
            @click="runGroup(group)"
            :disabled="groupStore.executingGroupId === group.id"
            class="flex-1 px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {{ groupStore.executingGroupId === group.id ? 'Running...' : 'Run Group' }}
          </button>
          <button
            @click="viewRuns(group)"
            class="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Runs
          </button>
          <button
            @click="editGroup(group)"
            class="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Edit
          </button>
          <button
            @click="confirmDelete(group)"
            class="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>

    <!-- Recent group runs section -->
    <div v-if="recentRuns.length > 0" class="mt-8">
      <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">Recent Runs</h2>
      <div class="space-y-2">
        <router-link
          v-for="run in recentRuns"
          :key="run.id"
          :to="`/groups/${run.groupId}/runs/${run.id}`"
          class="block bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:border-primary-300 transition-colors"
        >
          <div class="flex items-center justify-between">
            <div>
              <span class="font-medium text-gray-900 dark:text-white">{{ getGroupName(run.groupId) }}</span>
              <span class="text-sm text-gray-500 dark:text-gray-400 ml-2">
                {{ new Date(run.startedAt).toLocaleString() }}
              </span>
            </div>
            <div class="flex items-center gap-3">
              <span class="text-sm">
                <span class="text-green-600">{{ run.summary.passed }} passed</span>
                <span v-if="run.summary.failed > 0" class="text-red-600 ml-2">{{ run.summary.failed }} failed</span>
                <span v-if="run.summary.running > 0" class="text-yellow-600 ml-2">{{ run.summary.running }} running</span>
              </span>
              <span
                :class="{
                  'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300': run.status === 'passed',
                  'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300': run.status === 'failed',
                  'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300': run.status === 'partial',
                  'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300': run.status === 'running',
                  'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300': run.status === 'cancelled',
                }"
                class="text-xs font-medium px-2 py-1 rounded-full"
              >
                {{ run.status }}
              </span>
            </div>
          </div>
        </router-link>
      </div>
    </div>

    <!-- Create Modal -->
    <CreateGroupModal
      v-if="showCreateModal"
      @close="showCreateModal = false"
      @created="onGroupCreated"
    />

    <!-- Edit Modal -->
    <EditGroupModal
      v-if="editingGroup"
      :group="editingGroup"
      @close="editingGroup = null"
      @updated="onGroupUpdated"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useGroupStore } from '../stores/groups';
import { useTestStore } from '../stores/tests';
import { useConfigStore } from '../stores/config';
import CreateGroupModal from '../components/CreateGroupModal.vue';
import EditGroupModal from '../components/EditGroupModal.vue';
import type { TestGroup } from '@shared/types';

const router = useRouter();
const groupStore = useGroupStore();
const testStore = useTestStore();
const configStore = useConfigStore();

const showCreateModal = ref(false);
const editingGroup = ref<TestGroup | null>(null);

const recentRuns = computed(() => {
  return [...groupStore.groupRuns]
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
    .slice(0, 10);
});

function getTestName(testId: string): string {
  const test = testStore.findTest(testId);
  return test?.name || test?.description?.slice(0, 50) || testId;
}

function getGroupName(groupId: string): string {
  return groupStore.findGroup(groupId)?.name || groupId;
}

async function runGroup(group: TestGroup) {
  const aiConfig = configStore.aiConfig;
  if (!aiConfig) {
    groupStore.error = 'Please configure AI settings first';
    return;
  }
  const run = await groupStore.executeGroup(group.id, aiConfig);
  if (run) {
    router.push(`/groups/${group.id}/runs/${run.id}`);
  }
}

function viewRuns(group: TestGroup) {
  router.push(`/groups/${group.id}/runs`);
}

function editGroup(group: TestGroup) {
  editingGroup.value = group;
}

async function confirmDelete(group: TestGroup) {
  if (confirm(`Delete group "${group.name}"? This will also delete all group runs. Individual tests and results are NOT affected.`)) {
    await groupStore.deleteGroup(group.id);
  }
}

function onGroupCreated() {
  showCreateModal.value = false;
  groupStore.fetchGroups();
}

function onGroupUpdated() {
  editingGroup.value = null;
  groupStore.fetchGroups();
}

onMounted(async () => {
  configStore.loadConfig();
  await testStore.fetchTests();
  await groupStore.fetchGroups();
  // Fetch recent runs for all groups
  for (const group of groupStore.groups) {
    await groupStore.fetchGroupRuns(group.id);
  }
});
</script>
```

- [ ] **Step 2: Add route in main.ts**

In `frontend/src/main.ts`, add import:
```ts
import GroupsView from './views/GroupsView.vue'
import GroupRunDetail from './views/GroupRunDetail.vue'
```

Add to routes array (after the `/config` route):
```ts
  { path: '/groups', component: GroupsView },
  { path: '/groups/:groupId/runs', component: GroupsView },
  { path: '/groups/:groupId/runs/:runId', component: GroupRunDetail },
```

- [ ] **Step 3: Add nav link in App.vue**

In `frontend/src/App.vue`, after the existing "Tests" router-link (around line 11), add:
```html
            <router-link to="/groups" class="nav-link">Groups</router-link>
```

- [ ] **Step 4: Verify the page renders**

Run: `cd frontend && npm run dev`
Navigate to http://localhost:5173/groups
Expected: Empty state message "No groups yet."

- [ ] **Step 5: Commit**

```bash
git add frontend/src/views/GroupsView.vue frontend/src/main.ts frontend/src/App.vue
git commit -m "feat: add GroupsView page with navigation"
```

---

### Task 9: Create group modals (Create + Edit)

**Files:**
- Create: `frontend/src/components/CreateGroupModal.vue`
- Create: `frontend/src/components/EditGroupModal.vue`

- [ ] **Step 1: Create CreateGroupModal.vue**

Modal with: name, description, test picker (checkboxes with search), tag input, maxParallel slider.

```vue
<template>
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" @click.self="$emit('close')">
    <div class="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto mx-4 p-6">
      <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-4">Create Test Group</h2>

      <form @submit.prevent="handleSubmit">
        <!-- Name -->
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
          <input
            v-model="name"
            type="text"
            required
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
            placeholder="e.g., Checkout Flow Tests"
          />
        </div>

        <!-- Description -->
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
          <textarea
            v-model="description"
            rows="2"
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
            placeholder="Optional description"
          ></textarea>
        </div>

        <!-- Test Picker -->
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tests *</label>
          <input
            v-model="testSearch"
            type="text"
            class="w-full px-3 py-2 mb-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
            placeholder="Search tests..."
          />
          <div class="max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg">
            <label
              v-for="test in filteredTests"
              :key="test.id"
              class="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
            >
              <input
                type="checkbox"
                :value="test.id"
                v-model="selectedTestIds"
                class="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span class="text-sm text-gray-700 dark:text-gray-300 truncate">
                {{ test.name || test.description?.slice(0, 60) || test.id }}
              </span>
            </label>
            <div v-if="filteredTests.length === 0" class="px-3 py-4 text-sm text-gray-400 text-center">
              No tests found
            </div>
          </div>
          <p class="text-xs text-gray-500 mt-1">{{ selectedTestIds.length }} selected</p>
        </div>

        <!-- Tags -->
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tags</label>
          <div class="flex flex-wrap gap-1 mb-2">
            <span
              v-for="(tag, i) in tags"
              :key="i"
              class="inline-flex items-center gap-1 text-xs bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 px-2 py-0.5 rounded-full"
            >
              {{ tag }}
              <button type="button" @click="tags.splice(i, 1)" class="hover:text-red-500">&times;</button>
            </span>
          </div>
          <input
            v-model="tagInput"
            @keydown.enter.prevent="addTag"
            type="text"
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
            placeholder="Type a tag and press Enter"
          />
        </div>

        <!-- Max Parallel -->
        <div class="mb-6">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Max Parallel: {{ maxParallel }}
          </label>
          <input
            v-model.number="maxParallel"
            type="range"
            min="1"
            max="10"
            class="w-full"
          />
          <div class="flex justify-between text-xs text-gray-400">
            <span>1 (sequential)</span>
            <span>10</span>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex justify-end gap-3">
          <button
            type="button"
            @click="$emit('close')"
            class="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            :disabled="!canSubmit || groupStore.creatingGroup"
            class="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
          >
            {{ groupStore.creatingGroup ? 'Creating...' : 'Create Group' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useGroupStore } from '../stores/groups';
import { useTestStore } from '../stores/tests';

const emit = defineEmits<{
  close: [];
  created: [];
}>();

const groupStore = useGroupStore();
const testStore = useTestStore();

const name = ref('');
const description = ref('');
const selectedTestIds = ref<string[]>([]);
const tags = ref<string[]>([]);
const tagInput = ref('');
const maxParallel = ref(3);
const testSearch = ref('');

const filteredTests = computed(() => {
  const search = testSearch.value.toLowerCase();
  return testStore.tests.filter(t => {
    if (!search) return true;
    const testName = (t.name || t.description || t.id).toLowerCase();
    return testName.includes(search);
  });
});

const canSubmit = computed(() => {
  return name.value.trim() && selectedTestIds.value.length > 0;
});

function addTag() {
  const tag = tagInput.value.trim();
  if (tag && !tags.value.includes(tag)) {
    tags.value.push(tag);
  }
  tagInput.value = '';
}

async function handleSubmit() {
  const result = await groupStore.createGroup({
    name: name.value.trim(),
    description: description.value.trim() || undefined,
    testIds: selectedTestIds.value,
    tags: tags.value,
    maxParallel: maxParallel.value,
  });
  if (result) {
    emit('created');
  }
}
</script>
```

- [ ] **Step 2: Create EditGroupModal.vue**

Very similar to CreateGroupModal but pre-populated with existing group data and calls `updateGroup`.

```vue
<template>
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" @click.self="$emit('close')">
    <div class="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto mx-4 p-6">
      <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-4">Edit Group</h2>

      <form @submit.prevent="handleSubmit">
        <!-- Name -->
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
          <input
            v-model="name"
            type="text"
            required
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <!-- Description -->
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
          <textarea
            v-model="description"
            rows="2"
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
          ></textarea>
        </div>

        <!-- Test Picker -->
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tests *</label>
          <input
            v-model="testSearch"
            type="text"
            class="w-full px-3 py-2 mb-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
            placeholder="Search tests..."
          />
          <div class="max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg">
            <label
              v-for="test in filteredTests"
              :key="test.id"
              class="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
            >
              <input
                type="checkbox"
                :value="test.id"
                v-model="selectedTestIds"
                class="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span class="text-sm text-gray-700 dark:text-gray-300 truncate">
                {{ test.name || test.description?.slice(0, 60) || test.id }}
              </span>
            </label>
          </div>
          <p class="text-xs text-gray-500 mt-1">{{ selectedTestIds.length }} selected</p>
        </div>

        <!-- Tags -->
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tags</label>
          <div class="flex flex-wrap gap-1 mb-2">
            <span
              v-for="(tag, i) in tags"
              :key="i"
              class="inline-flex items-center gap-1 text-xs bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 px-2 py-0.5 rounded-full"
            >
              {{ tag }}
              <button type="button" @click="tags.splice(i, 1)" class="hover:text-red-500">&times;</button>
            </span>
          </div>
          <input
            v-model="tagInput"
            @keydown.enter.prevent="addTag"
            type="text"
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
            placeholder="Type a tag and press Enter"
          />
        </div>

        <!-- Max Parallel -->
        <div class="mb-6">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Max Parallel: {{ maxParallel }}
          </label>
          <input
            v-model.number="maxParallel"
            type="range"
            min="1"
            max="10"
            class="w-full"
          />
          <div class="flex justify-between text-xs text-gray-400">
            <span>1 (sequential)</span>
            <span>10</span>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex justify-end gap-3">
          <button
            type="button"
            @click="$emit('close')"
            class="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            :disabled="!canSubmit"
            class="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
          >
            Save Changes
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useGroupStore } from '../stores/groups';
import { useTestStore } from '../stores/tests';
import type { TestGroup } from '@shared/types';

const props = defineProps<{
  group: TestGroup;
}>();

const emit = defineEmits<{
  close: [];
  updated: [];
}>();

const groupStore = useGroupStore();
const testStore = useTestStore();

const name = ref(props.group.name);
const description = ref(props.group.description || '');
const selectedTestIds = ref<string[]>([...props.group.testIds]);
const tags = ref<string[]>([...props.group.tags]);
const tagInput = ref('');
const maxParallel = ref(props.group.maxParallel);
const testSearch = ref('');

const filteredTests = computed(() => {
  const search = testSearch.value.toLowerCase();
  return testStore.tests.filter(t => {
    if (!search) return true;
    const testName = (t.name || t.description || t.id).toLowerCase();
    return testName.includes(search);
  });
});

const canSubmit = computed(() => {
  return name.value.trim() && selectedTestIds.value.length > 0;
});

function addTag() {
  const tag = tagInput.value.trim();
  if (tag && !tags.value.includes(tag)) {
    tags.value.push(tag);
  }
  tagInput.value = '';
}

async function handleSubmit() {
  const result = await groupStore.updateGroup(props.group.id, {
    name: name.value.trim(),
    description: description.value.trim() || undefined,
    testIds: selectedTestIds.value,
    tags: tags.value,
    maxParallel: maxParallel.value,
  });
  if (result) {
    emit('updated');
  }
}
</script>
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/CreateGroupModal.vue frontend/src/components/EditGroupModal.vue
git commit -m "feat: add Create and Edit group modals with test picker"
```

---

### Task 10: Create GroupRunDetail view

**Files:**
- Create: `frontend/src/views/GroupRunDetail.vue`

- [ ] **Step 1: Create GroupRunDetail.vue**

Shows group run status with live polling, progress bar, and individual test results.

```vue
<template>
  <div class="max-w-5xl mx-auto px-4 py-6">
    <!-- Header -->
    <div class="flex items-center gap-3 mb-6">
      <router-link
        :to="`/groups`"
        class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
      >
        &larr; Groups
      </router-link>
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
        {{ groupName }} — Run Details
      </h1>
    </div>

    <!-- Loading -->
    <div v-if="!groupRun" class="flex justify-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
    </div>

    <template v-else>
      <!-- Status card -->
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <div class="flex items-center justify-between mb-4">
          <span
            :class="statusClasses"
            class="text-sm font-semibold px-3 py-1 rounded-full"
          >
            {{ groupRun.status.toUpperCase() }}
          </span>
          <span class="text-sm text-gray-500 dark:text-gray-400">
            Started: {{ new Date(groupRun.startedAt).toLocaleString() }}
            <span v-if="groupRun.completedAt"> | Completed: {{ new Date(groupRun.completedAt).toLocaleString() }}</span>
          </span>
        </div>

        <!-- Progress bar -->
        <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 mb-2 overflow-hidden">
          <div class="h-full flex">
            <div
              class="bg-green-500 transition-all duration-500"
              :style="{ width: passedPercent + '%' }"
            ></div>
            <div
              class="bg-red-500 transition-all duration-500"
              :style="{ width: failedPercent + '%' }"
            ></div>
            <div
              v-if="groupRun.status === 'running'"
              class="bg-blue-400 animate-pulse transition-all duration-500"
              :style="{ width: runningPercent + '%' }"
            ></div>
          </div>
        </div>

        <!-- Summary numbers -->
        <div class="flex gap-6 text-sm">
          <span class="text-gray-600 dark:text-gray-400">Total: <strong>{{ groupRun.summary.total }}</strong></span>
          <span class="text-green-600">Passed: <strong>{{ groupRun.summary.passed }}</strong></span>
          <span class="text-red-600">Failed: <strong>{{ groupRun.summary.failed }}</strong></span>
          <span v-if="groupRun.summary.running > 0" class="text-blue-600">Running: <strong>{{ groupRun.summary.running }}</strong></span>
        </div>
      </div>

      <!-- Individual test results -->
      <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-3">Test Results</h2>
      <div class="space-y-2">
        <div
          v-for="resultId in groupRun.resultIds"
          :key="resultId"
          class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
        >
          <div class="flex items-center justify-between">
            <div>
              <span class="font-medium text-gray-900 dark:text-white">
                {{ getTestNameForResult(resultId) }}
              </span>
              <span
                v-if="getResultStatus(resultId)"
                :class="{
                  'text-green-600': getResultStatus(resultId) === 'passed',
                  'text-red-600': getResultStatus(resultId) === 'failed',
                  'text-blue-600': getResultStatus(resultId) === 'running',
                  'text-yellow-600': getResultStatus(resultId) === 'error',
                }"
                class="text-sm ml-2"
              >
                {{ getResultStatus(resultId) }}
              </span>
            </div>
            <router-link
              v-if="getResultStatus(resultId) !== 'running'"
              :to="`/results/${resultId}`"
              class="text-sm text-primary-600 hover:text-primary-700"
            >
              View Details &rarr;
            </router-link>
          </div>
        </div>
        <div v-if="groupRun.resultIds.length === 0" class="text-gray-400 text-sm py-4 text-center">
          No results yet...
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import { useGroupStore } from '../stores/groups';
import { useTestStore } from '../stores/tests';
import { useResultStore } from '../stores/results';
import type { GroupRun, TestResult } from '@shared/types';

const route = useRoute();
const groupStore = useGroupStore();
const testStore = useTestStore();
const resultStore = useResultStore();

const groupRun = ref<GroupRun | null>(null);
const testResults = ref<Map<string, TestResult>>(new Map());
let pollInterval: ReturnType<typeof setInterval> | null = null;

const groupName = computed(() => {
  const groupId = route.params.groupId as string;
  return groupStore.findGroup(groupId)?.name || 'Group';
});

const statusClasses = computed(() => {
  if (!groupRun.value) return '';
  const s = groupRun.value.status;
  return {
    'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300': s === 'passed',
    'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300': s === 'failed',
    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300': s === 'partial',
    'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300': s === 'running',
    'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300': s === 'cancelled',
  };
});

const passedPercent = computed(() => {
  if (!groupRun.value) return 0;
  return (groupRun.value.summary.passed / groupRun.value.summary.total) * 100;
});

const failedPercent = computed(() => {
  if (!groupRun.value) return 0;
  return (groupRun.value.summary.failed / groupRun.value.summary.total) * 100;
});

const runningPercent = computed(() => {
  if (!groupRun.value) return 0;
  return (groupRun.value.summary.running / groupRun.value.summary.total) * 100;
});

function getTestNameForResult(resultId: string): string {
  const result = testResults.value.get(resultId);
  if (!result) return 'Loading...';
  const test = testStore.findTest(result.testRequestId);
  return test?.name || test?.description?.slice(0, 50) || result.testRequestId;
}

function getResultStatus(resultId: string): string | null {
  const result = testResults.value.get(resultId);
  return result?.status || null;
}

async function fetchData() {
  const runId = route.params.runId as string;
  const run = await groupStore.fetchGroupRun(runId);
  if (run) {
    groupRun.value = run;
    // Fetch individual results
    for (const resultId of run.resultIds) {
      const result = await resultStore.fetchResult(resultId);
      if (result) {
        testResults.value.set(resultId, result);
      }
    }
  }
}

function startPolling() {
  pollInterval = setInterval(async () => {
    await fetchData();
    if (groupRun.value && groupRun.value.status !== 'running') {
      stopPolling();
    }
  }, 2000);
}

function stopPolling() {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
}

onMounted(async () => {
  await testStore.fetchTests();
  await groupStore.fetchGroups();
  await fetchData();
  if (groupRun.value?.status === 'running') {
    startPolling();
  }
});

onUnmounted(() => {
  stopPolling();
});
</script>
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/views/GroupRunDetail.vue
git commit -m "feat: add GroupRunDetail view with live polling and progress bar"
```

---

### Task 11: Add group filter to TestsList.vue

**Files:**
- Modify: `frontend/src/views/TestsList.vue`

- [ ] **Step 1: Add group store import and filter state**

In the `<script setup>` section, add:
```ts
import { useGroupStore } from '../stores/groups';
const groupStore = useGroupStore();
const selectedGroupId = ref<string | null>(null);
```

- [ ] **Step 2: Add group filter dropdown in template**

After the existing header area (mode toggle buttons), add a group filter dropdown:
```html
        <!-- Group filter -->
        <div class="flex items-center gap-2">
          <select
            v-model="selectedGroupId"
            class="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
          >
            <option :value="null">All Tests</option>
            <option v-for="group in groupStore.groups" :key="group.id" :value="group.id">
              {{ group.name }}
            </option>
          </select>
          <button
            v-if="selectedGroupId"
            @click="runSelectedGroup"
            :disabled="groupStore.executingGroupId === selectedGroupId"
            class="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {{ groupStore.executingGroupId === selectedGroupId ? 'Running...' : 'Run Group' }}
          </button>
        </div>
```

- [ ] **Step 3: Add computed filtered tests and run handler**

Add a computed property that filters tests by group:
```ts
const filteredByGroup = computed(() => {
  if (!selectedGroupId.value) return null;
  const group = groupStore.findGroup(selectedGroupId.value);
  if (!group) return null;
  return new Set(group.testIds);
});
```

Use this in the existing test list rendering — wrap the existing filter logic to also filter by group when active. The existing `v-for` iterating over tests should check: `!filteredByGroup.value || filteredByGroup.value.has(test.id)`.

Add the run handler:
```ts
async function runSelectedGroup() {
  if (!selectedGroupId.value) return;
  const aiConfig = configStore.aiConfig;
  if (!aiConfig) {
    groupStore.error = 'Please configure AI settings first';
    return;
  }
  const run = await groupStore.executeGroup(selectedGroupId.value, aiConfig);
  if (run) {
    router.push(`/groups/${selectedGroupId.value}/runs/${run.id}`);
  }
}
```

- [ ] **Step 4: Fetch groups on mount**

In the existing `onMounted`, add:
```ts
groupStore.fetchGroups();
```

- [ ] **Step 5: Verify group filter works in the UI**

Navigate to /tests, select a group from dropdown, confirm only matching tests show.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/views/TestsList.vue
git commit -m "feat: add group filter and Run Group button to TestsList"
```

---

## Chunk 3: Integration & Verification

### Task 12: End-to-end verification

- [ ] **Step 1: Start backend and frontend**

```bash
cd backend && npx ts-node-dev src/index.ts &
cd frontend && npm run dev &
```

- [ ] **Step 2: Verify group CRUD**

1. Navigate to /groups
2. Click "Create Group", fill in name, select 2+ tests, add tags, set maxParallel
3. Verify group card appears
4. Click "Edit", change name, verify update
5. Create a second group for delete testing
6. Delete the second group, verify it's removed

- [ ] **Step 3: Verify group execution**

1. Click "Run Group" on a group
2. Verify redirect to GroupRunDetail
3. Verify progress bar updates in real-time
4. Verify individual test results appear with correct statuses
5. Verify clicking "View Details" links to existing TestResultDetail

- [ ] **Step 4: Verify TestsList group filter**

1. Navigate to /tests
2. Select a group from the dropdown
3. Verify only tests in that group are shown
4. Click "Run Group" button, verify execution starts

- [ ] **Step 5: Verify parallel execution (maxParallel > 1)**

Create a group with 3+ tests and maxParallel=3. Run it. Verify multiple browser windows open simultaneously.

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "feat: test groups with parallel execution — complete feature"
```
