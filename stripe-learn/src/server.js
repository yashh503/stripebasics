import app from './app.js';
import config from './config/index.js';
import logger from './utils/logger.js';
import * as dbLoader from './loaders/db.loader.js';

const startServer = async () => {
  try {
    // Connect to database
    await dbLoader.connect();
    // Start server
    app.listen(config.port, () => {
      logger.info(`Server running on port ${config.port} in ${config.env} mode ✅`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (error) => {
  logger.error('Unhandled Rejection:', error);
  process.exit(1);
});

startServer();