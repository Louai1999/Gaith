const logger = require('../lib/logger');
const config = require('../config');

class AppError extends Error {
  constructor(message, statusCode = 500, code = undefined) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
  }
}

function notFoundHandler(req, res, next) {
  next(new AppError('المسار غير موجود.', 404));
}

function errorHandler(err, req, res, _next) {
  const statusCode = err.statusCode || 500;
  const isOperational = err.isOperational === true;

  logger.error({
    message: err.message,
    statusCode,
    path: req.path,
    method: req.method,
    stack: err.stack,
    userId: req.user?.id,
  });

  const clientMessage = isOperational
    ? err.message
    : 'حدث خطأ غير متوقع. حاول مرة أخرى لاحقاً.';

  res.status(statusCode).json({
    success: false,
    message: clientMessage,
    ...(config.nodeEnv !== 'production' && !isOperational
      ? { debug: err.message }
      : {}),
  });
}

module.exports = { AppError, notFoundHandler, errorHandler };
