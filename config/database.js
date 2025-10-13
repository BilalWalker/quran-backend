//config/database.js
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const authConfig = {
  jwtSecret: process.env.JWT_SECRET || 'your-super-secret-jwt-key',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS) || 10,
  sessionTimeout: parseInt(process.env.SESSION_TIMEOUT) || 24 * 60 * 60 * 1000, // 24 hours
};

const generateToken = (payload) => {
  return jwt.sign(payload, authConfig.jwtSecret, {
    expiresIn: authConfig.jwtExpiresIn
  });
};

const verifyToken = (token) => {
  return jwt.verify(token, authConfig.jwtSecret);
};

const hashPassword = async (password) => {
  return await bcrypt.hash(password, authConfig.bcryptRounds);
};

const comparePassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};

module.exports = {
  authConfig,
  generateToken,
  verifyToken,
  hashPassword,
  comparePassword
};