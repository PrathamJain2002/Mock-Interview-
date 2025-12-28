// TEST: If you see this, logging is working!
console.log('🔍 Backend server file loaded...');

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
// Type definitions are in devDependencies but needed for build

// Load environment variables FIRST, before importing routes
// This ensures all route files can access process.env variables
dotenv.config();

// Import routes (after dotenv.config() so they can read env vars)
import resumeRoutes from './routes/resume';
import questionRoutes from './routes/questions';
import performanceRoutes from './routes/performance';
import userRoutes from './routes/users';

// Import database connection
import { connectDB } from './config/database';

// Check AI configuration
const GOOGLE_GENAI_API_KEY = process.env.GOOGLE_GENAI_API_KEY;
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama2';

// Log AI configuration immediately
console.log('========================================');
console.log('🤖 AI Configuration Status:');
console.log('========================================');
if (GOOGLE_GENAI_API_KEY) {
  console.log('✅ Google GenAI API Key: Found (PRIMARY)');
  console.log(`   Key length: ${GOOGLE_GENAI_API_KEY.length} characters`);
} else {
  console.log('⚠️  Google GenAI API Key: Not found (Will use Ollama as fallback)');
  console.log('   To enable Google GenAI, add GOOGLE_GENAI_API_KEY to your .env file');
}
console.log(`📦 Ollama URL: ${OLLAMA_URL}`);
console.log(`🤖 Ollama Model: ${OLLAMA_MODEL}`);
console.log('========================================\n');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Handle favicon requests (prevents 404 errors)
app.get('/favicon.ico', (req, res) => {
  res.status(204).end(); // No content, but success
});

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
      console.log('\n========================================');
      console.log('🚀 Server Started Successfully!');
      console.log('========================================');
      console.log(`📍 Port: ${PORT}`);
      console.log(`📱 Health check: http://localhost:${PORT}/api/health`);
      console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
      console.log(`📝 Resume parsing: http://localhost:${PORT}/api/resume/parse`);
      console.log(`❓ Question generation: http://localhost:${PORT}/api/questions/generate`);
      console.log(`📊 Performance analysis: http://localhost:${PORT}/api/performance/analyze`);
      console.log(`👥 User management: http://localhost:${PORT}/api/users`);
      console.log(`🗄️  MongoDB: Connected successfully`);
      console.log('\n💡 AI Service Priority:');
      if (GOOGLE_GENAI_API_KEY) {
        console.log('   1️⃣  Google GenAI (Primary)');
        console.log('   2️⃣  Ollama (Backup)');
      } else {
        console.log('   1️⃣  Ollama (Primary - Google GenAI key not found)');
      }
      console.log('   3️⃣  Smart Algorithm (Final Fallback)');
      console.log('========================================\n');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
