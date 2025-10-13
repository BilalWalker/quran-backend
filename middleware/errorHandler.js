// Error handling middleware
const errorHandler = (error, req, res, next) => {
  const logger = req.app.locals.logger;
  
  if (logger) {
    logger.error('Unhandled error:', { 
      error: error.message, 
      stack: error.stack 
    });
  }
  
  if (error.name === 'MulterError') {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        error: 'File too large. Maximum size is 50MB.' 
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ 
        error: 'Too many files. Maximum is 50 files.' 
      });
    }
  }
  
  res.status(500).json({ 
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : error.message 
  });
};

module.exports = errorHandler;