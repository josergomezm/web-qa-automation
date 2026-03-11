import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseService } from '../services/database';
import { logger } from '../utils/logger';
import { executeTestAsync } from '../services/testExecution';
import type { TestRequest, TestResult } from '@shared/types';

export const testRoutes = Router();
const db = new DatabaseService();

// Create a new test
testRoutes.post('/', async (req, res) => {
  try {
    const { baseUrl, name, description, credentials, formInputs, expectedOutcomes, aiModel, aiConfig, prerequisiteTests, isReusable, tags, cachedSteps } = req.body;

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
      name,
      baseUrl,
      description,
      credentials,
      formInputs,
      expectedOutcomes,
      prerequisiteTests,
      isReusable,
      tags,
      aiModel,
      createdAt: new Date(),
      cachedSteps: cachedSteps,
      lastSuccessfulRun: cachedSteps && cachedSteps.length > 0 ? new Date() : undefined
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

    // Execute test asynchronously (pass device if test was recorded on one)
    logger.info(`Starting async execution for test: ${test.id}${test.device ? ` on ${test.device}` : ''}`);
    executeTestAsync(test, aiConfig, result.id, undefined, test.device);

    res.json(result);
  } catch (error) {
    console.error('Error executing test:', error);
    res.status(500).json({ message: 'Failed to execute test' });
  }
});

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