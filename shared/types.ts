// Shared types between frontend and backend

export interface TestRequest {
  id: string;
  baseUrl: string;
  description: string;
  credentials?: {
    username?: string;
    password?: string;
    [key: string]: any;
  };
  formInputs?: Record<string, any>;
  expectedOutcomes?: string[];
  aiModel: string;
  createdAt: Date;
  archived?: boolean;
  archivedAt?: Date;
  cachedSteps?: any[]; // Cached successful test steps from previous runs
  lastSuccessfulRun?: Date; // When the cached steps were last successful
  prerequisiteTests?: string[]; // IDs of tests that should run before this test
  isReusable?: boolean; // Mark tests that can be used as prerequisites
  tags?: string[]; // Tags for categorizing tests (e.g., 'login', 'setup', 'navigation')
  globalWaitTime?: number; // Default wait time between steps (in milliseconds)
  waitForElements?: boolean; // Whether to wait for elements to be visible/clickable
}

export interface TestStep {
  action: string;
  element?: string;
  value?: string;
  timestamp: Date;
  screenshot?: string;
  success: boolean;
  error?: string;
  waitBefore?: number; // Wait time before executing this step (in milliseconds)
  waitAfter?: number; // Wait time after executing this step (in milliseconds)
  waitForCondition?: {
    type: 'visible' | 'hidden' | 'enabled' | 'disabled' | 'text' | 'value';
    selector?: string;
    text?: string;
    timeout?: number; // Max time to wait (default 5000ms)
  };
  // Prerequisite tracking
  isPrerequisite?: boolean;
  prerequisiteTestId?: string;
  prerequisiteTestDescription?: string;
  isMainTest?: boolean;
}

export interface PerformanceMetrics {
  pageLoadTime: number;
  totalTestTime: number;
  clickCount: number;
  networkRequests: number;
  consoleErrors: string[];
  consoleWarnings: string[];
}

export interface NetworkCall {
  url: string;
  method: string;
  status?: number;
  timestamp: Date;
  responseTime?: number;
  size?: number;
}

export interface ConsoleMessage {
  type: 'log' | 'error' | 'warning' | 'info';
  text: string;
  timestamp: Date;
}

export interface TestResult {
  id: string;
  testRequestId: string;
  status: 'passed' | 'failed' | 'running' | 'error';
  steps: TestStep[];
  performance: PerformanceMetrics;
  screenshots: string[];
  cost: number;
  executedAt: Date;
  completedAt?: Date;
  error?: string;
  archived?: boolean;
  archivedAt?: Date;
  consoleMessages?: ConsoleMessage[];
  networkCalls?: NetworkCall[];
  usedCachedSteps?: boolean; // Indicates if cached steps were used instead of AI generation
}

export interface AIConfig {
  provider: 'openai' | 'anthropic' | 'google' | 'custom';
  apiKey: string;
  model: string;
  endpoint?: string;
}

export interface TestReport {
  summary: {
    totalTests: number;
    passed: number;
    failed: number;
    totalCost: number;
    averageExecutionTime: number;
  };
  results: TestResult[];
}