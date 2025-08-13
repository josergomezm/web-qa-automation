import fs from 'fs/promises';
import path from 'path';
import type { TestRequest, TestResult } from '@shared/types';

export class DatabaseService {
  private dataDir: string;
  private testsFile: string;
  private resultsFile: string;

  constructor() {
    this.dataDir = path.join(process.cwd(), 'data');
    this.testsFile = path.join(this.dataDir, 'tests.json');
    this.resultsFile = path.join(this.dataDir, 'results.json');
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

  // Test operations
  async saveTest(test: TestRequest): Promise<void> {
    const tests = await this.readJsonFile<TestRequest>(this.testsFile);
    const existingIndex = tests.findIndex(t => t.id === test.id);
    
    if (existingIndex >= 0) {
      tests[existingIndex] = test;
    } else {
      tests.push(test);
    }
    
    await this.writeJsonFile(this.testsFile, tests);
  }

  async getTest(id: string): Promise<TestRequest | null> {
    const tests = await this.readJsonFile<TestRequest>(this.testsFile);
    const test = tests.find(t => t.id === id);
    
    if (!test) return null;
    
    return {
      ...test,
      createdAt: new Date(test.createdAt)
    };
  }

  async getAllTests(): Promise<TestRequest[]> {
    const tests = await this.readJsonFile<TestRequest>(this.testsFile);
    return tests
      .map(test => ({
        ...test,
        createdAt: new Date(test.createdAt)
      }))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // Result operations
  async saveResult(result: TestResult): Promise<void> {
    const results = await this.readJsonFile<TestResult>(this.resultsFile);
    const existingIndex = results.findIndex(r => r.id === result.id);
    
    if (existingIndex >= 0) {
      results[existingIndex] = result;
    } else {
      results.push(result);
    }
    
    await this.writeJsonFile(this.resultsFile, results);
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

  // Archive operations
  async archiveTest(id: string): Promise<void> {
    const tests = await this.readJsonFile<TestRequest>(this.testsFile);
    const testIndex = tests.findIndex(t => t.id === id);
    
    if (testIndex >= 0) {
      tests[testIndex].archived = true;
      tests[testIndex].archivedAt = new Date();
      await this.writeJsonFile(this.testsFile, tests);
    }
  }

  async unarchiveTest(id: string): Promise<void> {
    const tests = await this.readJsonFile<TestRequest>(this.testsFile);
    const testIndex = tests.findIndex(t => t.id === id);
    
    if (testIndex >= 0) {
      tests[testIndex].archived = false;
      delete tests[testIndex].archivedAt;
      await this.writeJsonFile(this.testsFile, tests);
    }
  }

  async archiveResult(id: string): Promise<void> {
    const results = await this.readJsonFile<TestResult>(this.resultsFile);
    const resultIndex = results.findIndex(r => r.id === id);
    
    if (resultIndex >= 0) {
      results[resultIndex].archived = true;
      results[resultIndex].archivedAt = new Date();
      await this.writeJsonFile(this.resultsFile, results);
    }
  }

  async unarchiveResult(id: string): Promise<void> {
    const results = await this.readJsonFile<TestResult>(this.resultsFile);
    const resultIndex = results.findIndex(r => r.id === id);
    
    if (resultIndex >= 0) {
      results[resultIndex].archived = false;
      delete results[resultIndex].archivedAt;
      await this.writeJsonFile(this.resultsFile, results);
    }
  }

  // Get only active (non-archived) items
  async getActiveTests(): Promise<TestRequest[]> {
    const tests = await this.getAllTests();
    return tests.filter(test => !test.archived);
  }

  async getActiveResults(): Promise<TestResult[]> {
    const results = await this.getAllResults();
    return results.filter(result => !result.archived);
  }

  // Get only archived items
  async getArchivedTests(): Promise<TestRequest[]> {
    const tests = await this.getAllTests();
    return tests.filter(test => test.archived);
  }

  async getArchivedResults(): Promise<TestResult[]> {
    const results = await this.getAllResults();
    return results.filter(result => result.archived);
  }

  // Cache operations
  async updateCachedSteps(testId: string, steps: any[]): Promise<void> {
    const tests = await this.readJsonFile<TestRequest>(this.testsFile);
    const testIndex = tests.findIndex(t => t.id === testId);
    
    if (testIndex >= 0) {
      tests[testIndex].cachedSteps = steps;
      tests[testIndex].lastSuccessfulRun = new Date();
      await this.writeJsonFile(this.testsFile, tests);
    }
  }

  async getCachedSteps(testId: string): Promise<any[] | null> {
    const test = await this.getTest(testId);
    return test?.cachedSteps || null;
  }

  // Delete operations
  async deleteTest(testId: string): Promise<void> {
    const tests = await this.readJsonFile<TestRequest>(this.testsFile);
    const filteredTests = tests.filter(t => t.id !== testId);
    await this.writeJsonFile(this.testsFile, filteredTests);
  }

  async deleteResult(resultId: string): Promise<void> {
    const results = await this.readJsonFile<TestResult>(this.resultsFile);
    const filteredResults = results.filter(r => r.id !== resultId);
    await this.writeJsonFile(this.resultsFile, filteredResults);
  }

  async deleteResultsByTestId(testId: string): Promise<void> {
    const results = await this.readJsonFile<TestResult>(this.resultsFile);
    const filteredResults = results.filter(r => r.testRequestId !== testId);
    await this.writeJsonFile(this.resultsFile, filteredResults);
  }
}