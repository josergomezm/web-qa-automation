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
    cachedSteps?: any[];
    lastSuccessfulRun?: Date;
    prerequisiteTests?: string[];
    isReusable?: boolean;
    tags?: string[];
    globalWaitTime?: number;
    waitForElements?: boolean;
}
export interface TestStep {
    action: string;
    element?: string;
    value?: string;
    timestamp: Date;
    screenshot?: string;
    success: boolean;
    error?: string;
    waitBefore?: number;
    waitAfter?: number;
    waitForCondition?: {
        type: 'visible' | 'hidden' | 'enabled' | 'disabled' | 'text' | 'value';
        selector?: string;
        text?: string;
        timeout?: number;
    };
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
    usedCachedSteps?: boolean;
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
//# sourceMappingURL=types.d.ts.map