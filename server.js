require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const winston = require('winston');

// Import SQLite DB
const db = require('./config/db');

// Import middleware
const { authenticateToken, authorize, logActivity } = require('./middleware/auth');
const { requestLogger } = require('./middleware/logger');
const errorHandler = require('./middleware/errorHandler');

// Import routes
const authRoutes = require('./routes/auth.routes');
const ayahRoutes = require('./routes/ayah.routes');
const userRoutes = require('./routes/user.routes');
const surahRoutes = require('./routes/surah.routes');
const translationRoutes = require('./routes/translation.routes');
const audioRoutes = require('./routes/audio.routes');
const searchRoutes = require('./routes/search.routes');
const analyticsRoutes = require('./routes/analytics.routes');
const importExportRoutes = require('./routes/importExport.routes');
const naatRoutes = require('./routes/naat.routes'); // ✅ NEW

const app = express();
const PORT = process.env.PORT || 3001;

// Logger configuration
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'quran-admin-backend' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

// Make logger available globally
app.locals.logger = logger;

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      mediaSrc: ["'self'"],
    },
  },
}));

app.use(compression());

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : ['http://localhost:5173'];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all in development
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};
app.use(cors(corsOptions));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use(requestLogger(logger));

// Static files for audio
app.use('/audio', express.static('public/audio', { 
  maxAge: '1y', 
  etag: true, 
  lastModified: true 
}));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/naats', naatRoutes); // ✅ PUBLIC ROUTES - Must come before any auth middleware
app.use('/api/ayah', ayahRoutes);
app.use('/api/users', userRoutes);
app.use('/api/surahs', surahRoutes);
app.use('/api/surah', surahRoutes);
app.use('/api/translations', translationRoutes);
app.use('/api/translation', translationRoutes);
app.use('/api/audio', audioRoutes);
app.use('/api', audioRoutes); // handles /api/reciters
app.use('/api/search', searchRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/activity-logs', analyticsRoutes);
app.use('/api/export', importExportRoutes);
app.use('/api/import', importExportRoutes);

// Health check route
app.get('/api/health', (req, res) => {
  try {
    const row = db.prepare('SELECT 1 as test').get();
    const dbHealthy = row && row.test === 1;
    
    res.json({
      status: dbHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: '1.0.0',
      database: dbHealthy ? 'connected' : 'disconnected'
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({ 
      status: 'unhealthy', 
      timestamp: new Date().toISOString(), 
      error: 'Database connection failed' 
    });
  }
});

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use((req, res) => { 
  res.status(404).json({ error: 'Route not found' }); 
});

// Graceful shutdown
process.on('SIGTERM', () => { 
  logger.info('SIGTERM received, shutting down gracefully'); 
  db.close();
  process.exit(0); 
});

process.on('SIGINT', () => { 
  logger.info('SIGINT received, shutting down gracefully'); 
  db.close();
  process.exit(0); 
});

// Start server
const server = app.listen(PORT, () => {
  logger.info(`Quran Admin Server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`Health check: http://localhost:${PORT}/api/health`);
});

module.exports = app;