import { Router } from 'express';
import { DatabaseService } from '../services/database';
import type { TestReport } from '@shared/types';

export const resultRoutes = Router();
const db = new DatabaseService();

// Get active results (must come before /:id route)
resultRoutes.get('/active/list', async (req, res) => {
  try {
    const results = await db.getActiveResults();
    res.json(results);
  } catch (error) {
    console.error('Error fetching active results:', error);
    res.status(500).json({ message: 'Failed to fetch active results' });
  }
});

// Get archived results (must come before /:id route)
resultRoutes.get('/archived/list', async (req, res) => {
  try {
    const results = await db.getArchivedResults();
    res.json(results);
  } catch (error) {
    console.error('Error fetching archived results:', error);
    res.status(500).json({ message: 'Failed to fetch archived results' });
  }
});

// Get all test results
resultRoutes.get('/', async (req, res) => {
  try {
    const results = await db.getAllResults();
    res.json(results);
  } catch (error) {
    console.error('Error fetching results:', error);
    res.status(500).json({ message: 'Failed to fetch results' });
  }
});

// Get a specific test result (must come after specific routes)
resultRoutes.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.getResult(id);
    
    if (!result) {
      return res.status(404).json({ message: 'Result not found' });
    }
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching result:', error);
    res.status(500).json({ message: 'Failed to fetch result' });
  }
});

// Get test report with summary
resultRoutes.get('/report/summary', async (req, res) => {
  try {
    const results = await db.getAllResults();
    
    const report: TestReport = {
      summary: {
        totalTests: results.length,
        passed: results.filter(r => r.status === 'passed').length,
        failed: results.filter(r => r.status === 'failed').length,
        totalCost: results.reduce((sum, r) => sum + r.cost, 0),
        averageExecutionTime: results.length > 0 
          ? results.reduce((sum, r) => sum + r.performance.totalTestTime, 0) / results.length 
          : 0
      },
      results
    };
    
    res.json(report);
  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({ message: 'Failed to generate report' });
  }
});

// Get results for a specific test
resultRoutes.get('/test/:testId', async (req, res) => {
  try {
    const { testId } = req.params;
    const results = await db.getResultsByTestId(testId);
    res.json(results);
  } catch (error) {
    console.error('Error fetching test results:', error);
    res.status(500).json({ message: 'Failed to fetch test results' });
  }
});

// Archive a result
resultRoutes.patch('/:id/archive', async (req, res) => {
  try {
    const { id } = req.params;
    await db.archiveResult(id);
    res.json({ message: 'Result archived successfully' });
  } catch (error) {
    console.error('Error archiving result:', error);
    res.status(500).json({ message: 'Failed to archive result' });
  }
});

// Unarchive a result
resultRoutes.patch('/:id/unarchive', async (req, res) => {
  try {
    const { id } = req.params;
    await db.unarchiveResult(id);
    res.json({ message: 'Result unarchived successfully' });
  } catch (error) {
    console.error('Error unarchiving result:', error);
    res.status(500).json({ message: 'Failed to unarchive result' });
  }
});

// Delete a result
resultRoutes.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.deleteResult(id);
    res.json({ message: 'Result deleted successfully' });
  } catch (error) {
    console.error('Error deleting result:', error);
    res.status(500).json({ message: 'Failed to delete result' });
  }
});