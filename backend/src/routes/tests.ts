import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AIService } from '../services/ai';
import { AutomationService } from '../services/automation';
import { DatabaseService } from '../services/database';
import { logger } from '../utils/logger';
import type { TestRequest, TestResult } from '@shared/types';

export const testRoutes = Router();
const db = new DatabaseService();

// Create a new test
testRoutes.post('/', async (req, res) => {
  try {
    const { baseUrl, description, credentials, formInputs, expectedOutcomes, aiModel, aiConfig, prerequisiteTests, isReusable, tags } = req.body;

    logger.info('Creating new test');
    logger.json('AI Config', {
      provider: aiConfig?.provider,
      hasApiKey: !!aiConfig?.apiKey,
      model: aiConfig?.model
    });

    if (!baseUrl || !description || !aiConfig) {
      return res.status(400).json({ message: 'Base URL, description and AI config are required' });
    }

    const testRequest: TestRequest = {
      id: uuidv4(),
      baseUrl,
      description,
      credentials,
      formInputs,
      expectedOutcomes,
      prerequisiteTests,
      isReusable,
      tags,
      aiModel,
      createdAt: new Date()
    };

    await db.saveTest(testRequest);
    res.json(testRequest);
  } catch (error) {
    console.error('Error creating test:', error);
    res.status(500).json({ message: 'Failed to create test' });
  }
});

// Execute a test
testRoutes.post('/:id/execute', async (req, res) => {
  try {
    const { id } = req.params;
    const test = await db.getTest(id);

    if (!test) {
      return res.status(404).json({ message: 'Test not found' });
    }

    // Get AI config from request
    const aiConfig = req.body.aiConfig;

    logger.separator('AUTOMATED TEST STARTED');
    logger.test(`Executing test: ${test.description}`);
    logger.json('AI Config', {
      provider: aiConfig?.provider,
      hasApiKey: !!aiConfig?.apiKey,
      model: aiConfig?.model
    });

    if (!aiConfig || !aiConfig.apiKey) {
      return res.status(400).json({
        message: 'AI configuration with API key is required. Please configure your AI settings in the frontend.'
      });
    }

    const result: TestResult = {
      id: uuidv4(),
      testRequestId: id,
      status: 'running',
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
      executedAt: new Date()
    };

    // Save initial result
    await db.saveResult(result);

    // Execute test asynchronously
    logger.info(`Starting async execution for test: ${test.id}`);
    executeTestAsync(test, aiConfig, result.id);

    res.json(result);
  } catch (error) {
    console.error('Error executing test:', error);
    res.status(500).json({ message: 'Failed to execute test' });
  }
});

async function executeTestAsync(test: TestRequest, aiConfig: any, resultId: string) {
  const automation = new AutomationService();
  const executionId = resultId.slice(-8); // Use last 8 chars of result ID for tracking

  try {
    logger.separator(`TEST EXECUTION STARTED [${executionId}]`);
    logger.test(`Executing test: ${test.description}`);
    logger.json('AI Config', {
      provider: aiConfig?.provider,
      hasApiKey: !!aiConfig?.apiKey,
      model: aiConfig?.model
    });

    // Initialize browser automation early since we need it for prerequisites
    logger.separator('BROWSER AUTOMATION');
    logger.info('Initializing browser automation...');
    await automation.initialize();
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
        
        const { steps: prereqExecutedSteps } = await automation.executeSteps(prereqTest.cachedSteps, prereqWaitConfig);
        
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
    const cachedSteps = await db.getCachedSteps(test.id);
    
    if (cachedSteps && cachedSteps.length > 0) {
      logger.separator('MAIN TEST - USING CACHED STEPS');
      logger.success(`Using ${cachedSteps.length} cached steps from previous successful run`);
      mainTestSteps = cachedSteps;
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
    logger.info(`Executing ${mainTestSteps.length} main test steps`);
    const waitConfig = {
      globalWaitTime: test.globalWaitTime,
      waitForElements: test.waitForElements
    };
    const { steps: mainExecutedSteps, performance, screenshots, consoleMessages, networkCalls } = await automation.executeSteps(mainTestSteps, waitConfig);
    
    // Mark main test steps and combine with prerequisite steps for reporting
    const markedMainSteps = mainExecutedSteps.map(step => ({
      ...step,
      isPrerequisite: false,
      isMainTest: true
    }));
    
    // Combine all executed steps for the final result (prerequisites + main test steps)
    const executedSteps = [...steps, ...markedMainSteps];
    logger.success('All steps executed successfully');

    // Determine overall status
    const hasFailures = executedSteps.some(step => !step.success);
    const status = hasFailures ? 'failed' : 'passed';

    // If the test passed and we used AI-generated steps (not cached), cache them for future runs
    if (status === 'passed' && !usedCachedSteps) {
      logger.success('Test passed! Caching steps for future runs');
      // Only cache the main test steps, not the prerequisite steps
      await db.updateCachedSteps(test.id, mainTestSteps);
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
      usedCachedSteps: usedCachedSteps // Flag to indicate cached steps were used
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
      error: error instanceof Error ? error.message : 'Unknown error'
    };

    await db.saveResult(errorResult);
  } finally {
    logger.info('Cleaning up automation service...');
    await automation.cleanup();
    logger.success('Cleanup completed');
    logger.separator();
  }
}

// Get active tests (must come before /:id route)
testRoutes.get('/active/list', async (req, res) => {
  try {
    const tests = await db.getActiveTests();
    res.json(tests);
  } catch (error) {
    console.error('Error fetching active tests:', error);
    res.status(500).json({ message: 'Failed to fetch active tests' });
  }
});

// Get archived tests (must come before /:id route)
testRoutes.get('/archived/list', async (req, res) => {
  try {
    const tests = await db.getArchivedTests();
    res.json(tests);
  } catch (error) {
    console.error('Error fetching archived tests:', error);
    res.status(500).json({ message: 'Failed to fetch archived tests' });
  }
});

// Get all tests
testRoutes.get('/', async (req, res) => {
  try {
    const tests = await db.getAllTests();
    res.json(tests);
  } catch (error) {
    console.error('Error fetching tests:', error);
    res.status(500).json({ message: 'Failed to fetch tests' });
  }
});

// Get a specific test (must come after specific routes)
testRoutes.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const test = await db.getTest(id);

    if (!test) {
      return res.status(404).json({ message: 'Test not found' });
    }

    res.json(test);
  } catch (error) {
    console.error('Error fetching test:', error);
    res.status(500).json({ message: 'Failed to fetch test' });
  }
});

// Archive a test
testRoutes.patch('/:id/archive', async (req, res) => {
  try {
    const { id } = req.params;
    await db.archiveTest(id);
    res.json({ message: 'Test archived successfully' });
  } catch (error) {
    console.error('Error archiving test:', error);
    res.status(500).json({ message: 'Failed to archive test' });
  }
});

// Unarchive a test
testRoutes.patch('/:id/unarchive', async (req, res) => {
  try {
    const { id } = req.params;
    await db.unarchiveTest(id);
    res.json({ message: 'Test unarchived successfully' });
  } catch (error) {
    console.error('Error unarchiving test:', error);
    res.status(500).json({ message: 'Failed to unarchive test' });
  }
});

// Update test settings (tags, reusability, etc.)
testRoutes.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const existingTest = await db.getTest(id);
    if (!existingTest) {
      return res.status(404).json({ message: 'Test not found' });
    }
    
    const updatedTest = { ...existingTest, ...updateData };
    await db.saveTest(updatedTest);
    
    res.json(updatedTest);
  } catch (error) {
    console.error('Error updating test:', error);
    res.status(500).json({ message: 'Failed to update test' });
  }
});

// Clear cached steps for a test (force regeneration on next run)
testRoutes.delete('/:id/cache', async (req, res) => {
  try {
    const { id } = req.params;
    await db.updateCachedSteps(id, []);
    res.json({ message: 'Cached steps cleared successfully' });
  } catch (error) {
    console.error('Error clearing cached steps:', error);
    res.status(500).json({ message: 'Failed to clear cached steps' });
  }
});

// Delete a test and all its results
testRoutes.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // First delete all results for this test
    await db.deleteResultsByTestId(id);
    
    // Then delete the test itself
    await db.deleteTest(id);
    
    res.json({ message: 'Test and all associated results deleted successfully' });
  } catch (error) {
    console.error('Error deleting test:', error);
    res.status(500).json({ message: 'Failed to delete test' });
  }
});