import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { devices as playwrightDevices } from 'playwright';
import { DatabaseService } from '../services/database';
import { executeTestAsync } from '../services/testExecution';
import type { TestGroup, GroupRun, DeviceInfo } from '@shared/types';

const db = new DatabaseService();

// ─── Concurrency helper ────────────────────────────────────────────────────

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

// ─── Background execution ──────────────────────────────────────────────────

async function executeGroupAsync(
  groupRunId: string,
  testIds: string[],
  devices: string[],
  maxParallel: number,
  aiConfig: any
): Promise<void> {
  interface Task { testId: string; device?: string }
  const taskDefs: Task[] = [];

  if (devices.length > 0) {
    for (const testId of testIds) {
      for (const device of devices) {
        taskDefs.push({ testId, device });
      }
    }
  } else {
    for (const testId of testIds) {
      taskDefs.push({ testId });
    }
  }

  const tasks = taskDefs.map((task) => async (): Promise<void> => {
    // Load the test
    const test = await db.getTest(task.testId);
    if (!test) {
      console.error(`[group-run] Test ${task.testId} not found, skipping`);
      return;
    }

    // Create initial TestResult
    const resultId = uuidv4();
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
      groupRunId,
    };

    await db.saveResult(initialResult as any);

    // Track resultId in GroupRun — atomic update to prevent race conditions
    await db.updateGroupRun(groupRunId, (run) => {
      run.resultIds.push(resultId);
    });

    // Execute
    await executeTestAsync(test, aiConfig, resultId, groupRunId, task.device);

    // Determine outcome and update summary atomically
    const completedResult = await db.getResult(resultId);
    const passed = completedResult?.status === 'passed';

    await db.updateGroupRun(groupRunId, (run) => {
      run.summary.running = Math.max(0, run.summary.running - 1);
      if (passed) {
        run.summary.passed++;
      } else {
        run.summary.failed++;
      }
    });
  });

  await executeWithConcurrencyLimit(tasks, maxParallel);

  // Finalize GroupRun
  const finalRun = await db.getGroupRun(groupRunId);
  if (finalRun) {
    const { passed, failed, total } = finalRun.summary;
    finalRun.status =
      failed === 0 ? 'passed' :
      passed === 0 ? 'failed' :
      'partial';
    finalRun.completedAt = new Date().toISOString();
    await db.saveGroupRun(finalRun);
  }
}

// ─── Main group router (/api/groups) ──────────────────────────────────────

export const router = Router();

const CURATED_DEVICES = [
  'iPhone 15', 'iPhone 14', 'iPhone 13', 'iPhone SE',
  'iPad Pro 11', 'iPad Mini',
  'Pixel 7', 'Pixel 5',
  'Galaxy S9+', 'Galaxy Tab S4',
  'Desktop Chrome', 'Desktop Safari', 'Desktop Firefox',
];

// GET /devices — List available devices for emulation
router.get('/devices', (_req, res) => {
  const devices: DeviceInfo[] = CURATED_DEVICES
    .map((name) => {
      const descriptor = playwrightDevices[name];
      if (!descriptor) return null;
      return {
        name,
        viewport: descriptor.viewport,
        isMobile: descriptor.isMobile ?? false,
      } as DeviceInfo;
    })
    .filter((d): d is DeviceInfo => d !== null);

  res.json(devices);
});

// POST / — Create group
router.post('/', async (req, res) => {
  try {
    const { name, description, testIds, tags, maxParallel, devices } = req.body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ message: 'Group name is required' });
    }

    if (!Array.isArray(testIds) || testIds.length === 0) {
      return res.status(400).json({ message: 'testIds must be a non-empty array' });
    }

    // Validate all testIds exist
    for (const testId of testIds) {
      const test = await db.getTest(testId);
      if (!test) {
        return res.status(400).json({ message: `Test not found: ${testId}` });
      }
    }

    const clampedParallel = Math.min(10, Math.max(1, Number(maxParallel) || 3));

    const group: TestGroup = {
      id: uuidv4(),
      name: name.trim(),
      description: description || '',
      testIds,
      tags: Array.isArray(tags) ? tags : [],
      devices: Array.isArray(devices) ? devices : [],
      maxParallel: clampedParallel,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.saveGroup(group);
    res.status(201).json(group);
  } catch (error) {
    console.error('Error creating group:', error);
    res.status(500).json({ message: 'Failed to create group' });
  }
});

// GET / — List all groups
router.get('/', async (req, res) => {
  try {
    const groups = await db.getAllGroups();
    res.json(groups);
  } catch (error) {
    console.error('Error fetching groups:', error);
    res.status(500).json({ message: 'Failed to fetch groups' });
  }
});

// GET /:id — Get single group
router.get('/:id', async (req, res) => {
  try {
    const group = await db.getGroup(req.params.id);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }
    res.json(group);
  } catch (error) {
    console.error('Error fetching group:', error);
    res.status(500).json({ message: 'Failed to fetch group' });
  }
});

// PATCH /:id — Update group
router.patch('/:id', async (req, res) => {
  try {
    const existing = await db.getGroup(req.params.id);
    if (!existing) {
      return res.status(404).json({ message: 'Group not found' });
    }

    const { name, description, testIds, tags, maxParallel, devices } = req.body;

    const updated: TestGroup = {
      ...existing,
      ...(name !== undefined ? { name: String(name).trim() } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(Array.isArray(testIds) ? { testIds } : {}),
      ...(Array.isArray(tags) ? { tags } : {}),
      ...(maxParallel !== undefined
        ? { maxParallel: Math.min(10, Math.max(1, Number(maxParallel) || existing.maxParallel)) }
        : {}),
      ...(devices !== undefined ? { devices } : {}),
      updatedAt: new Date().toISOString(),
    };

    await db.saveGroup(updated);
    res.json(updated);
  } catch (error) {
    console.error('Error updating group:', error);
    res.status(500).json({ message: 'Failed to update group' });
  }
});

// DELETE /:id — Delete group and its group runs (NOT test results)
router.delete('/:id', async (req, res) => {
  try {
    const group = await db.getGroup(req.params.id);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    await db.deleteGroupRunsByGroupId(req.params.id);
    await db.deleteGroup(req.params.id);

    res.json({ message: 'Group and its runs deleted successfully' });
  } catch (error) {
    console.error('Error deleting group:', error);
    res.status(500).json({ message: 'Failed to delete group' });
  }
});

// GET /:id/runs — List runs for a group
router.get('/:id/runs', async (req, res) => {
  try {
    const group = await db.getGroup(req.params.id);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    const runs = await db.getGroupRunsByGroupId(req.params.id);
    res.json(runs);
  } catch (error) {
    console.error('Error fetching group runs:', error);
    res.status(500).json({ message: 'Failed to fetch group runs' });
  }
});

// POST /:id/execute — Execute group
router.post('/:id/execute', async (req, res) => {
  try {
    const group = await db.getGroup(req.params.id);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    const { aiConfig } = req.body;
    if (!aiConfig || !aiConfig.apiKey) {
      return res.status(400).json({
        message: 'AI configuration with API key is required',
      });
    }

    const totalTasks = group.devices && group.devices.length > 0
      ? group.testIds.length * group.devices.length
      : group.testIds.length;

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
    };

    await db.saveGroupRun(groupRun);

    // Launch execution in background — do not await
    executeGroupAsync(groupRun.id, group.testIds, group.devices ?? [], group.maxParallel, aiConfig).catch((err) => {
      console.error(`[group-run] executeGroupAsync failed for run ${groupRun.id}:`, err);
    });

    res.status(202).json(groupRun);
  } catch (error) {
    console.error('Error executing group:', error);
    res.status(500).json({ message: 'Failed to execute group' });
  }
});

// ─── Group run router (/api/group-runs) ───────────────────────────────────

export const groupRunRouter = Router();

// GET /:runId — Get single group run
groupRunRouter.get('/:runId', async (req, res) => {
  try {
    const run = await db.getGroupRun(req.params.runId);
    if (!run) {
      return res.status(404).json({ message: 'Group run not found' });
    }
    res.json(run);
  } catch (error) {
    console.error('Error fetching group run:', error);
    res.status(500).json({ message: 'Failed to fetch group run' });
  }
});

export { router as groupRouter };
