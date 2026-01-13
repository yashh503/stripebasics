import ApiError from '../utils/ApiError.js';

const notFoundMiddleware = (req, res, next) => {
  next(ApiError.notFound(`Route ${req.originalUrl} not found`));
};

export default notFoundMiddleware;
