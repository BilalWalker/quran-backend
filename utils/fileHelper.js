// utils/fileHelper.js
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class FileHelper {
  static async ensureDirectory(dirPath) {
    try {
      await fs.mkdir(dirPath, { recursive: true });
      return true;
    } catch (error) {
      throw new Error(`Failed to create directory: ${error.message}`);
    }
  }

  static async deleteFile(filePath) {
    try {
      await fs.unlink(filePath);
      return true;
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw new Error(`Failed to delete file: ${error.message}`);
      }
      return false; // file already absent
    }
  }

  static async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  static async getFileStats(filePath) {
    try {
      const stats = await fs.stat(filePath);
      return {
        size: stats.size,
        created: stats.birthtime || stats.ctime,
        modified: stats.mtime,
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory()
      };
    } catch (error) {
      throw new Error(`Failed to get file stats: ${error.message}`);
    }
  }

  static generateUniqueFilename(originalName, prefix = '') {
    const ext = path.extname(originalName);
    const name = path.basename(originalName, ext).replace(/\s+/g, '_');
    const timestamp = Date.now();
    const random = crypto.randomBytes(4).toString('hex');
    return `${prefix}${name}_${timestamp}_${random}${ext}`;
  }

  static validateAudioFile(file) {
    const maxSize = 50 * 1024 * 1024; // 50MB
    const allowedMimeTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-m4a', 'audio/m4a'];
    const allowedExtensions = ['.mp3', '.wav', '.m4a'];

    const errors = [];

    if (!file) {
      errors.push('No file provided');
      return { isValid: false, errors };
    }

    if (file.size > maxSize) errors.push('File size exceeds 50MB limit');
    if (!allowedMimeTypes.includes(file.mimetype)) errors.push(`Invalid file type. Allowed types: ${allowedMimeTypes.join(', ')}`);
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowedExtensions.includes(ext)) errors.push(`Invalid file extension. Allowed extensions: ${allowedExtensions.join(', ')}`);

    return { isValid: errors.length === 0, errors };
  }

  static formatFileSize(bytes) {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }

  static async cleanupTempFiles(tempDir, maxAge = 24 * 60 * 60 * 1000) {
    try {
      const files = await fs.readdir(tempDir);
      const now = Date.now();
      let cleanedCount = 0;
      for (const file of files) {
        const filePath = path.join(tempDir, file);
        const stats = await this.getFileStats(filePath);
        if (now - stats.created.getTime() > maxAge) {
          await this.deleteFile(filePath);
          cleanedCount++;
        }
      }
      return cleanedCount;
    } catch (error) {
      // don't throw if temp doesn't exist; caller can handle
      return 0;
    }
  }
}

module.exports = FileHelper;
