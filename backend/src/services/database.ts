import fs from 'fs/promises';
import path from 'path';
import type { TestRequest, TestResult, TestGroup, GroupRun } from '@shared/types';

export class DatabaseService {
  private dataDir: string;
  private testsFile: string;
  private resultsFile: string;
  private groupsFile: string;
  private groupRunsFile: string;
  private writeQueues: Map<string, Promise<void>> = new Map();

  /**
   * Serializes all read-modify-write operations on a given file.
   * CRITICAL: Every method that reads a file, modifies the data, and writes it back
   * MUST wrap the entire read+write inside this method to prevent race conditions.
   */
  private async serializedWrite(filePath: string, writeFn: () => Promise<void>): Promise<void> {
    const previous = this.writeQueues.get(filePath) || Promise.resolve();
    const next = previous.then(writeFn, writeFn);
    this.writeQueues.set(filePath, next);
    return next;
  }

  constructor() {
    this.dataDir = path.join(process.cwd(), 'data');
    this.testsFile = path.join(this.dataDir, 'tests.json');
    this.resultsFile = path.join(this.dataDir, 'results.json');
    this.groupsFile = path.join(this.dataDir, 'groups.json');
    this.groupRunsFile = path.join(this.dataDir, 'group-runs.json');
    this.ensureDataDir();
  }

  private async ensureDataDir(): Promise<void> {
    try {
      await fs.access(this.dataDir);
    } catch {
      await fs.mkdir(this.dataDir, { recursive: true });
    }
  }

  private async readJsonFile<T>(filePath: string): Promise<T[]> {
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  private async writeJsonFile<T>(filePath: string, data: T[]): Promise<void> {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
  }

  // ─── Test operations ───────────────────────────────────────────────────────

  async saveTest(test: TestRequest): Promise<void> {
    await this.serializedWrite(this.testsFile, async () => {
      const tests = await this.readJsonFile<TestRequest>(this.testsFile);
      const existingIndex = tests.findIndex(t => t.id === test.id);
      if (existingIndex >= 0) {
        tests[existingIndex] = test;
      } else {
        tests.push(test);
      }
      await this.writeJsonFile(this.testsFile, tests);
    });
  }

  async getTest(id: string): Promise<TestRequest | null> {
    const tests = await this.readJsonFile<TestRequest>(this.testsFile);
    const test = tests.find(t => t.id === id);
    if (!test) return null;
    return { ...test, createdAt: new Date(test.createdAt) };
  }

  async getAllTests(): Promise<TestRequest[]> {
    const tests = await this.readJsonFile<TestRequest>(this.testsFile);
    return tests
      .map(test => ({ ...test, createdAt: new Date(test.createdAt) }))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async archiveTest(id: string): Promise<void> {
    await this.serializedWrite(this.testsFile, async () => {
      const tests = await this.readJsonFile<TestRequest>(this.testsFile);
      const testIndex = tests.findIndex(t => t.id === id);
      if (testIndex >= 0) {
        tests[testIndex].archived = true;
        tests[testIndex].archivedAt = new Date();
        await this.writeJsonFile(this.testsFile, tests);
      }
    });
  }

  async unarchiveTest(id: string): Promise<void> {
    await this.serializedWrite(this.testsFile, async () => {
      const tests = await this.readJsonFile<TestRequest>(this.testsFile);
      const testIndex = tests.findIndex(t => t.id === id);
      if (testIndex >= 0) {
        tests[testIndex].archived = false;
        delete tests[testIndex].archivedAt;
        await this.writeJsonFile(this.testsFile, tests);
      }
    });
  }

  async updateCachedSteps(testId: string, steps: any[]): Promise<void> {
    await this.serializedWrite(this.testsFile, async () => {
      const tests = await this.readJsonFile<TestRequest>(this.testsFile);
      const testIndex = tests.findIndex(t => t.id === testId);
      if (testIndex >= 0) {
        tests[testIndex].cachedSteps = steps;
        tests[testIndex].lastSuccessfulRun = new Date();
        await this.writeJsonFile(this.testsFile, tests);
      }
    });
  }

  async getCachedSteps(testId: string): Promise<any[] | null> {
    const test = await this.getTest(testId);
    return test?.cachedSteps || null;
  }

  async deleteTest(testId: string): Promise<void> {
    await this.serializedWrite(this.testsFile, async () => {
      const tests = await this.readJsonFile<TestRequest>(this.testsFile);
      const filteredTests = tests.filter(t => t.id !== testId);
      await this.writeJsonFile(this.testsFile, filteredTests);
    });
  }

  // ─── Result operations ─────────────────────────────────────────────────────

  async saveResult(result: TestResult): Promise<void> {
    await this.serializedWrite(this.resultsFile, async () => {
      const results = await this.readJsonFile<TestResult>(this.resultsFile);
      const existingIndex = results.findIndex(r => r.id === result.id);
      if (existingIndex >= 0) {
        results[existingIndex] = result;
      } else {
        results.push(result);
      }
      await this.writeJsonFile(this.resultsFile, results);
    });
  }

  async getResult(id: string): Promise<TestResult | null> {
    const results = await this.readJsonFile<TestResult>(this.resultsFile);
    const result = results.find(r => r.id === id);
    if (!result) return null;
    return {
      ...result,
      executedAt: new Date(result.executedAt),
      completedAt: result.completedAt ? new Date(result.completedAt) : undefined,
      steps: result.steps.map(step => ({
        ...step,
        timestamp: new Date(step.timestamp)
      }))
    };
  }

  async getAllResults(): Promise<TestResult[]> {
    const results = await this.readJsonFile<TestResult>(this.resultsFile);
    return results
      .map(result => ({
        ...result,
        executedAt: new Date(result.executedAt),
        completedAt: result.completedAt ? new Date(result.completedAt) : undefined,
        steps: result.steps.map(step => ({
          ...step,
          timestamp: new Date(step.timestamp)
        }))
      }))
      .sort((a, b) => b.executedAt.getTime() - a.executedAt.getTime());
  }

  async getResultsByTestId(testId: string): Promise<TestResult[]> {
    const results = await this.getAllResults();
    return results
      .filter(result => result.testRequestId === testId)
      .sort((a, b) => b.executedAt.getTime() - a.executedAt.getTime());
  }

  async archiveResult(id: string): Promise<void> {
    await this.serializedWrite(this.resultsFile, async () => {
      const results = await this.readJsonFile<TestResult>(this.resultsFile);
      const resultIndex = results.findIndex(r => r.id === id);
      if (resultIndex >= 0) {
        results[resultIndex].archived = true;
        results[resultIndex].archivedAt = new Date();
        await this.writeJsonFile(this.resultsFile, results);
      }
    });
  }

  async unarchiveResult(id: string): Promise<void> {
    await this.serializedWrite(this.resultsFile, async () => {
      const results = await this.readJsonFile<TestResult>(this.resultsFile);
      const resultIndex = results.findIndex(r => r.id === id);
      if (resultIndex >= 0) {
        results[resultIndex].archived = false;
        delete results[resultIndex].archivedAt;
        await this.writeJsonFile(this.resultsFile, results);
      }
    });
  }

  async deleteResult(resultId: string): Promise<void> {
    await this.serializedWrite(this.resultsFile, async () => {
      const results = await this.readJsonFile<TestResult>(this.resultsFile);
      const filteredResults = results.filter(r => r.id !== resultId);
      await this.writeJsonFile(this.resultsFile, filteredResults);
    });
  }

  async deleteResultsByTestId(testId: string): Promise<void> {
    await this.serializedWrite(this.resultsFile, async () => {
      const results = await this.readJsonFile<TestResult>(this.resultsFile);
      const filteredResults = results.filter(r => r.testRequestId !== testId);
      await this.writeJsonFile(this.resultsFile, filteredResults);
    });
  }

  // ─── Active/Archived helpers (read-only, no serialization needed) ──────────

  async getActiveTests(): Promise<TestRequest[]> {
    const tests = await this.getAllTests();
    return tests.filter(test => !test.archived);
  }

  async getActiveResults(): Promise<TestResult[]> {
    const results = await this.getAllResults();
    return results.filter(result => !result.archived);
  }

  async getArchivedTests(): Promise<TestRequest[]> {
    const tests = await this.getAllTests();
    return tests.filter(test => test.archived);
  }

  async getArchivedResults(): Promise<TestResult[]> {
    const results = await this.getAllResults();
    return results.filter(result => result.archived);
  }

  // ─── Group operations ──────────────────────────────────────────────────────

  async saveGroup(group: TestGroup): Promise<void> {
    await this.serializedWrite(this.groupsFile, async () => {
      await this.ensureDataDir();
      const groups = await this.readJsonFile<TestGroup>(this.groupsFile);
      const index = groups.findIndex(g => g.id === group.id);
      if (index >= 0) {
        groups[index] = group;
      } else {
        groups.push(group);
      }
      await this.writeJsonFile(this.groupsFile, groups);
    });
  }

  async getGroup(id: string): Promise<TestGroup | null> {
    const groups = await this.readJsonFile<TestGroup>(this.groupsFile);
    return groups.find(g => g.id === id) || null;
  }

  async getAllGroups(): Promise<TestGroup[]> {
    return this.readJsonFile<TestGroup>(this.groupsFile);
  }

  async deleteGroup(id: string): Promise<void> {
    await this.serializedWrite(this.groupsFile, async () => {
      await this.ensureDataDir();
      const groups = await this.readJsonFile<TestGroup>(this.groupsFile);
      const filtered = groups.filter(g => g.id !== id);
      await this.writeJsonFile(this.groupsFile, filtered);
    });
  }

  // ─── Group Run operations ──────────────────────────────────────────────────

  async saveGroupRun(groupRun: GroupRun): Promise<void> {
    await this.serializedWrite(this.groupRunsFile, async () => {
      await this.ensureDataDir();
      const runs = await this.readJsonFile<GroupRun>(this.groupRunsFile);
      const index = runs.findIndex(r => r.id === groupRun.id);
      if (index >= 0) {
        runs[index] = groupRun;
      } else {
        runs.push(groupRun);
      }
      await this.writeJsonFile(this.groupRunsFile, runs);
    });
  }

  async getGroupRun(id: string): Promise<GroupRun | null> {
    const runs = await this.readJsonFile<GroupRun>(this.groupRunsFile);
    return runs.find(r => r.id === id) || null;
  }

  async updateGroupRun(id: string, updateFn: (run: GroupRun) => void): Promise<GroupRun | null> {
    await this.serializedWrite(this.groupRunsFile, async () => {
      await this.ensureDataDir();
      const runs = await this.readJsonFile<GroupRun>(this.groupRunsFile);
      const index = runs.findIndex(r => r.id === id);
      if (index < 0) return;
      updateFn(runs[index]);
      await this.writeJsonFile(this.groupRunsFile, runs);
    });
    return this.getGroupRun(id);
  }

  async getGroupRunsByGroupId(groupId: string): Promise<GroupRun[]> {
    const runs = await this.readJsonFile<GroupRun>(this.groupRunsFile);
    return runs.filter(r => r.groupId === groupId);
  }

  async deleteGroupRunsByGroupId(groupId: string): Promise<void> {
    await this.serializedWrite(this.groupRunsFile, async () => {
      await this.ensureDataDir();
      const runs = await this.readJsonFile<GroupRun>(this.groupRunsFile);
      const filtered = runs.filter(r => r.groupId !== groupId);
      await this.writeJsonFile(this.groupRunsFile, filtered);
    });
  }

  async cancelStaleGroupRuns(): Promise<void> {
    await this.serializedWrite(this.groupRunsFile, async () => {
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
    });
  }
}

// Singleton instance — all modules MUST use this to prevent write race conditions
export const db = new DatabaseService();
