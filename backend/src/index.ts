import express from 'express';
import cors from 'cors';
import { testRoutes } from './routes/tests';
import { resultRoutes } from './routes/results';
import { recordingRoutes } from './routes/recording';
import { groupRouter, groupRunRouter } from './routes/groups';
import { DatabaseService } from './services/database';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/tests', testRoutes);
app.use('/api/results', resultRoutes);
app.use('/api/recording', recordingRoutes);
app.use('/api/groups', groupRouter);
app.use('/api/group-runs', groupRunRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Startup cleanup: cancel any group runs that were left in 'running' state
const db = new DatabaseService();
db.cancelStaleGroupRuns().catch(err => {
  console.error('Failed to cancel stale group runs:', err);
});

// Start server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 QA Automation Backend running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🧪 API endpoints: http://localhost:${PORT}/api`);
});