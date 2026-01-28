import express from 'express';
import cors from 'cors';
import { testRoutes } from './routes/tests';
import { resultRoutes } from './routes/results';
import { recordingRoutes } from './routes/recording';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/tests', testRoutes);
app.use('/api/results', resultRoutes);
app.use('/api/recording', recordingRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Start server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 QA Automation Backend running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🧪 API endpoints: http://localhost:${PORT}/api`);
});