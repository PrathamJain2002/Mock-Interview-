import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Import routes
import resumeRoutes from './routes/resume';
import questionRoutes from './routes/questions';
import performanceRoutes from './routes/performance';
import userRoutes from './routes/users';

// Import database connection
import { connectDB } from './config/database';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Routes
app.use('/api/resume', resumeRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/performance', performanceRoutes);
app.use('/api/users', userRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'AI Mock Interview Backend is running!',
    timestamp: new Date().toISOString()
  });
});

// Connect to MongoDB
connectDB();

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl
  });
});

// Start server
const startServer = async () => {
  try {
    // Wait for database connection before starting server
    await connectDB();
    
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📱 Health check: http://localhost:${PORT}/api/health`);
      console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
      console.log(`📝 Resume parsing: http://localhost:${PORT}/api/resume/parse`);
      console.log(`❓ Question generation: http://localhost:${PORT}/api/questions/generate`);
      console.log(`📊 Performance analysis: http://localhost:${PORT}/api/performance/analyze`);
      console.log(`👥 User management: http://localhost:${PORT}/api/users`);
      console.log(`🗄️  MongoDB connected successfully`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
