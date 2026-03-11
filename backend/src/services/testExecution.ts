import { AIService } from './ai';
import { AutomationService } from './automation';
import { DatabaseService } from './database';
import { logger } from '../utils/logger';
import type { TestRequest, TestResult } from '@shared/types';

const db = new DatabaseService();

export async function executeTestAsync(
  test: TestRequest,
  aiConfig: any,
  resultId: string,
  groupRunId?: string,
  device?: string
): Promise<void> {
  const automation = new AutomationService();
  const executionId = resultId.slice(-8); // Use last 8 chars of result ID for tracking

  // Helper to update real-time status
  const onStepUpdate = async (action: string) => {
    try {
      const currentResult = await db.getResult(resultId);
      if (currentResult) {
        currentResult.currentAction = action;
        await db.saveResult(currentResult);
      }
    } catch (e) {
      console.error('Failed to update result status:', e);
    }
  };

  try {
    logger.separator(`TEST EXECUTION STARTED [${executionId}]`);
    logger.test(`Executing test: ${test.description}`);
    logger.json('AI Config', {
      provider: aiConfig?.provider,
      hasApiKey: !!aiConfig?.apiKey,
      model: aiConfig?.model
    });

    // If this execution belongs to a group run, tag the initial result record
    if (groupRunId) {
      const initialResult = await db.getResult(resultId);
      if (initialResult) {
        initialResult.groupRunId = groupRunId;
        await db.saveResult(initialResult);
      }
    }

    // Initialize browser automation early since we need it for prerequisites
    logger.separator('BROWSER AUTOMATION');
    logger.info('Initializing browser automation...');
    await automation.initialize(device);
    logger.success('Browser automation initialized successfully');

    let steps: any[] = [];
    let cost = 0;

    // First, execute prerequisite tests if any
    if (test.prerequisiteTests && test.prerequisiteTests.length > 0) {
      logger.info(`Found ${test.prerequisiteTests.length} prerequisite test(s)`);

      for (let i = 0; i < test.prerequisiteTests.length; i++) {
        const prereqTestId = test.prerequisiteTests[i];
        const prereqTest = await db.getTest(prereqTestId);

        if (!prereqTest) {
          logger.error(`Prerequisite test ${prereqTestId} not found`);
          throw new Error(`Prerequisite test ${prereqTestId} not found`);
        }

        if (!prereqTest.cachedSteps || prereqTest.cachedSteps.length === 0) {
          logger.error(`Prerequisite test "${prereqTest.description}" has no cached steps`);
          throw new Error(`Prerequisite test "${prereqTest.description}" has no cached steps. Please run it successfully first.`);
        }

        logger.separator(`PREREQUISITE ${i + 1}/${test.prerequisiteTests.length}`);
        logger.test(`Executing: ${prereqTest.description}`);
        logger.info(`Using ${prereqTest.cachedSteps.length} cached steps`);

        // Execute the prerequisite steps and check if they pass
        const prereqWaitConfig = {
          globalWaitTime: prereqTest.globalWaitTime,
          waitForElements: prereqTest.waitForElements
        };

        const { steps: prereqExecutedSteps } = await automation.executeSteps(prereqTest.cachedSteps, prereqWaitConfig, onStepUpdate);

        // Check if any prerequisite step failed
        const hasFailures = prereqExecutedSteps.some(step => !step.success);
        if (hasFailures) {
          const failedSteps = prereqExecutedSteps.filter(step => !step.success);
          logger.error(`Prerequisite test failed: ${failedSteps.map(s => s.action).join(', ')}`);
          throw new Error(`Prerequisite test "${prereqTest.description}" failed. Failed steps: ${failedSteps.map(s => s.action).join(', ')}`);
        }

        logger.success(`Prerequisite test completed successfully`);
        // Mark prerequisite steps and add them to the overall steps for reporting
        const markedPrereqSteps = prereqExecutedSteps.map(step => ({
          ...step,
          isPrerequisite: true,
          prerequisiteTestId: prereqTest.id,
          prerequisiteTestDescription: prereqTest.description
        }));
        steps.push(...markedPrereqSteps);
      }
    }

    // Now generate or get main test steps AFTER prerequisites have been executed
    let mainTestSteps: any[];
    let usedCachedSteps = false;

    // Check if we have cached steps from a previous successful run
    // The `cachedSteps` property on the `test` object is populated from the DB when the test is loaded.
    if (test.cachedSteps && test.cachedSteps.length > 0) {
      logger.separator('MAIN TEST - USING CACHED STEPS');
      logger.success(`Using ${test.cachedSteps.length} cached steps from previous successful run`);
      mainTestSteps = [...test.cachedSteps]; // Assign to mainTestSteps

      // Ensure we start by navigating to the base URL if the first step isn't a navigation
      if (mainTestSteps[0].action !== 'navigate') {
        mainTestSteps.unshift({
          action: 'navigate',
          url: test.baseUrl
        });
        logger.info(`Added automatic navigation to ${test.baseUrl}`);
      }
      usedCachedSteps = true;
      // No AI cost when using cached steps
    } else {
      // Generate test steps using AI AFTER prerequisites have been executed
      logger.separator('MAIN TEST - GENERATING NEW STEPS');
      logger.info('Prerequisites completed successfully, now generating main test steps with AI');
      logger.test(`Test: ${test.description}`);

      const aiService = new AIService(aiConfig);

      // Include context about what prerequisites accomplished
      const prerequisiteContext = steps.length > 0
        ? `The following prerequisite steps have already been executed successfully and the browser is now in the resulting state: ${JSON.stringify(steps.map(s => ({ action: s.action, description: s.description || `${s.action} on ${s.element}` })))}`
        : '';

      const waitConfig = {
        globalWaitTime: test.globalWaitTime,
        waitForElements: test.waitForElements
      };

      mainTestSteps = await aiService.generateTestSteps(
        test.baseUrl,
        test.description,
        test.credentials,
        test.formInputs,
        prerequisiteContext,
        waitConfig
      );
      logger.success(`Generated ${mainTestSteps.length} test steps`);
      logger.json('Generated Steps', mainTestSteps);

      // Calculate cost using actual token usage
      cost = aiService.calculateCost();
    }

    // Execute only the main test steps (prerequisites already executed)
    logger.separator('MAIN TEST EXECUTION');

    let currentStepsToExecute = mainTestSteps;
    let mainExecutedSteps: any[] = [];
    let retryCount = 0;
    const maxRetries = test.maxRetries || 0;
    let finalStatus: 'passed' | 'failed' = 'failed';

    // Initialize accumulators
    const performance: any = {
      pageLoadTime: 0,
      totalTestTime: 0,
      clickCount: 0,
      networkRequests: 0,
      consoleErrors: [],
      consoleWarnings: []
    };
    const screenshots: string[] = [];
    let consoleMessages: any[] = [];
    let networkCalls: any[] = [];

    // Retry loop
    while (retryCount <= maxRetries) {
      if (retryCount > 0) {
        logger.separator(`RETRY ATTEMPT ${retryCount}/${maxRetries}`);
        logger.info(`Executing ${currentStepsToExecute.length} refined steps`);
      } else {
        logger.info(`Executing ${currentStepsToExecute.length} main test steps`);
      }

      const waitConfig = {
        globalWaitTime: test.globalWaitTime,
        waitForElements: test.waitForElements
      };

      const executionResult = await automation.executeSteps(currentStepsToExecute, waitConfig, onStepUpdate);

      // Update performance metrics
      if (executionResult.performance) {
        performance.totalTestTime += executionResult.performance.totalTestTime;
        performance.clickCount += executionResult.performance.clickCount;
        performance.networkRequests += executionResult.performance.networkRequests;
        if (executionResult.performance.consoleErrors) {
          performance.consoleErrors.push(...executionResult.performance.consoleErrors);
        }
        if (executionResult.performance.consoleWarnings) {
          performance.consoleWarnings.push(...executionResult.performance.consoleWarnings);
        }
        // Keep the last page load time
        performance.pageLoadTime = executionResult.performance.pageLoadTime;
      }

      if (executionResult.consoleMessages) {
        consoleMessages = [...consoleMessages, ...executionResult.consoleMessages];
      }
      if (executionResult.networkCalls) {
        networkCalls = [...networkCalls, ...executionResult.networkCalls];
      }
      if (executionResult.screenshots) {
        screenshots.push(...executionResult.screenshots);
      }

      // Add these steps to our tracking
      const batchSteps = executionResult.steps.map(step => ({
        ...step,
        isPrerequisite: false,
        isMainTest: true,
        retryAttempt: retryCount
      }));
      mainExecutedSteps.push(...batchSteps);

      // Check success
      const hasFailures = executionResult.steps.some(step => !step.success);

      if (!hasFailures) {
        finalStatus = 'passed';
        logger.success(retryCount > 0 ? `Retry attempt ${retryCount} successful!` : 'Main test steps executed successfully');
        break;
      }

      // Handle failure
      if (retryCount >= maxRetries) {
        logger.error(maxRetries > 0 ? `All ${maxRetries} retry attempts failed` : 'Test failed');
        finalStatus = 'failed';
        break;
      }

      // Prepare for retry
      retryCount++;
      const failedStep = executionResult.steps.find(step => !step.success);
      if (!failedStep) {
        break;
      }

      logger.warning(`Test failed at step: ${failedStep.action} on ${failedStep.element || 'unknown'}`);
      logger.info('Generating refined steps for retry...');

      try {
        const pageSource = await automation.getPageContent();
        const aiService = new AIService(aiConfig);

        // Use all steps executed so far as context
        const allContextSteps = [...steps, ...mainExecutedSteps.filter(s => s.success)];

        const refinedSteps = await aiService.generateRefinedSteps(
          test.baseUrl,
          test.description,
          failedStep,
          failedStep.error || 'Unknown error',
          allContextSteps,
          pageSource,
          test.credentials,
          test.formInputs
        );

        logger.success(`Generated ${refinedSteps.length} refined steps for retry`);
        currentStepsToExecute = refinedSteps;

        cost += aiService.calculateCost();
      } catch (refinementError) {
        logger.error(`Failed to generate refined steps: ${refinementError}`);
        break;
      }
    }

    // Combine all executed steps
    const executedSteps = [...steps, ...mainExecutedSteps];

    // Determine overall status
    const status = finalStatus;

    // If the test passed and we used AI-generated steps (not cached), cache them for future runs
    if (status === 'passed') {
      if (usedCachedSteps && retryCount > 0) {
        logger.info(`Test passed with ${retryCount} retries.`);
      } else if (!usedCachedSteps && retryCount === 0) {
        logger.success('Test passed cleanly. Caching steps.');
        await db.updateCachedSteps(test.id, mainTestSteps);
      }
    }

    // Update result
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
      ...(device ? { device } : {})
    };

    await db.saveResult(updatedResult);

    logger.separator('TEST COMPLETED');
    logger.success(`Test finished with status: ${status}`);
    logger.info(`Total execution time: ${performance.totalTestTime}ms`);
    logger.info(`Screenshots captured: ${screenshots.length}`);

  } catch (error) {
    logger.separator('TEST FAILED');
    logger.error('Test execution failed');
    logger.error(error instanceof Error ? error.message : 'Unknown error');
    if (error instanceof Error && error.stack) {
      logger.debug('Error stack trace:');
      console.log(error.stack);
    }

    // Update result with error
    const errorResult: TestResult = {
      id: resultId,
      testRequestId: test.id,
      status: 'error',
      steps: [],
      performance: {
        pageLoadTime: 0,
        totalTestTime: 0,
        clickCount: 0,
        networkRequests: 0,
        consoleErrors: [],
        consoleWarnings: []
      },
      screenshots: [],
      cost: 0,
      executedAt: new Date(),
      completedAt: new Date(),
      error: error instanceof Error ? error.message : 'Unknown error',
      ...(groupRunId ? { groupRunId } : {}),
      ...(device ? { device } : {})
    };

    await db.saveResult(errorResult);
  } finally {
    logger.info('Cleaning up automation service...');
    await automation.cleanup();
    logger.success('Cleanup completed');
    logger.separator();
  }
}
