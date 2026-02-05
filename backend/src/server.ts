import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import authRoutes from './routes/auth';
import videoRoutes, { queueRoutes } from './routes/videos';
import ttsRoutes from './routes/tts';
import imageRoutes from './routes/images';
import youtubeRoutes from './routes/youtube';
import instagramRoutes from './routes/instagram';
import topicRoutes from './routes/topic';
import socialRoutes from './routes/social';
import { testConnection } from './config/db';
import { errorHandler, notFoundHandler, ApiError } from './middleware/errorHandler';
import { responseFormatter } from './middleware/responseFormatter';
import { generalLimiter, authLimiter, ttsLimiter, imageLimiter } from './middleware/rateLimiter';
import { CONFIG } from './constants/config';
import { promises as fs } from 'fs';
import autoPostScheduler from './services/autoPostScheduler';
import { startVideoPollingService } from './services/videoPollingService';

// Validate configuration at startup
CONFIG.validate();

const app = express();
const PORT = CONFIG.SERVER.PORT;

app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increase limit for base64 images
app.use(express.urlencoded({ extended: true }));
app.use(responseFormatter);
app.use(generalLimiter);

// Serve static files
app.use('/renders', express.static(path.join(__dirname, '..', 'public', 'renders')));
app.use('/images', express.static(path.join(__dirname, '..', 'public', 'images')));

// Ensure images directory exists
const imagesDir = path.join(__dirname, '..', 'public', 'images');
fs.access(imagesDir).catch(() => {
  fs.mkdir(imagesDir, { recursive: true });
});

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/queue', queueRoutes);
app.use('/api/tts', ttsLimiter, ttsRoutes);
app.use('/api/images', imageLimiter, imageRoutes);
app.use('/api/youtube', youtubeRoutes);
app.use('/api/instagram', instagramRoutes);
app.use('/api/topic', topicRoutes);
app.use('/api/social', socialRoutes);

// Health check endpoint
app.get('/api/health', async (req: Request, res: Response) => {
  try {
    res.status(200).json({
      status: 'ok',
      message: 'Backend is running.',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Health check failed:', err);
    res.status(500).json({
      status: 'error',
      message: 'Backend error.'
    });
  }
});

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  const frontendPath = path.join(__dirname, '..', 'public', 'frontend');
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// Serve frontend in production
app.use(express.static(path.join(__dirname, '..', 'public', 'frontend')));

// Handle SPA routing - serve index.html for all non-API routes
app.get('*', (req: Request, res: Response) => {
  const frontendPath = path.join(__dirname, '..', 'public', 'frontend');
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// 404 Not Found handler (register before error handler)
app.use(notFoundHandler);

// Global error handling middleware (MUST be last)
app.use(errorHandler);

// Start server with database connection test
const startServer = async () => {
  try {
    await testConnection();
    app.listen(PORT, () => {
      console.log(`✓ Server is running on http://localhost:${PORT}`);
      autoPostScheduler.start();
      startVideoPollingService();
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
