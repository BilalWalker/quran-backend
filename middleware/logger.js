// Request logging middleware
const requestLogger = (logger) => {
  return (req, res, next) => {
    logger.info({ 
      method: req.method, 
      url: req.url, 
      ip: req.ip 
    });
    next();
  };
};

module.exports = {
  requestLogger
};