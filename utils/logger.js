// utils/logger.js
const winston = require('winston');
const path = require('path');
const fs = require('fs');

const logDir = path.join(process.cwd(), 'logs');
// Ensure logs directory exists
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: {
    service: 'quran-admin',
    version: process.env.npm_package_version || '1.0.0'
  },
  transports: [
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 10 * 1024 * 1024,
      maxFiles: 5,
      tailable: true
    }),
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: 10 * 1024 * 1024,
      maxFiles: 10,
      tailable: true
    }),
    new winston.transports.File({
      filename: path.join(logDir, 'audit.log'),
      level: 'warn',
      maxsize: 5 * 1024 * 1024,
      maxFiles: 20,
      tailable: true
    })
  ],
  exceptionHandlers: [
    new winston.transports.File({ filename: path.join(logDir, 'exceptions.log') })
  ],
  rejectionHandlers: [
    new winston.transports.File({ filename: path.join(logDir, 'rejections.log') })
  ]
});

// Console in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

logger.audit = (message, meta = {}) => {
  logger.warn(`AUDIT: ${message}`, { type: 'audit', ...meta, timestamp: new Date().toISOString() });
};

logger.security = (message, meta = {}) => {
  logger.error(`SECURITY: ${message}`, { type: 'security', ...meta, timestamp: new Date().toISOString() });
};

module.exports = logger;
