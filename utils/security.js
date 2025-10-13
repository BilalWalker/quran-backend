// utils/security.js
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const net = require('net');

class SecurityHelper {
  static generateSecureToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  static hashData(data) {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  static sanitizeFilename(filename) {
    return filename
      .replace(/[^a-zA-Z0-9.\-_]/g, '_')
      .replace(/_{2,}/g, '_')
      .toLowerCase();
  }

  static createRateLimiter(windowMs, max, message) {
    return rateLimit({
      windowMs,
      max,
      message: { error: message },
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => {
        res.status(429).json({ error: message, retryAfter: Math.ceil(windowMs / 1000) });
      }
    });
  }

  static isValidIP(ip) {
    // Use Node built-in check - supports IPv4 and IPv6
    return Boolean(net.isIP(ip));
  }

  static maskSensitiveData(obj, sensitiveFields = ['password', 'token', 'secret']) {
    if (!obj || typeof obj !== 'object') return obj;
    const masked = Array.isArray(obj) ? [...obj] : { ...obj };
    sensitiveFields.forEach(field => {
      if (masked[field]) masked[field] = '***MASKED***';
    });
    return masked;
  }
}

module.exports = SecurityHelper;
