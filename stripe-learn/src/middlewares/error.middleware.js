import config from '../config/index.js';
import logger from '../utils/logger.js';
import ApiError from '../utils/ApiError.js';

const errorMiddleware = (err, req, res, next) => {
  let error = err;

  // If not an ApiError, convert it
  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || 500;
    const message = error.message || 'Internal Server Error';
    error = new ApiError(statusCode, message, false);
  }

  const response = {
    error: {
      message: error.message,
      ...(config.env === 'development' && { stack: error.stack }),
    },
  };

  // Log error
  if (error.statusCode >= 500) {
    logger.error(error);
  } else {
    logger.warn(error.message);
  }

  res.status(error.statusCode).json(response);
};

export default errorMiddleware;
