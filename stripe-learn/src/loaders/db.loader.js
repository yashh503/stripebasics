import mongoose from 'mongoose';
import config from '../config/index.js';
import logger from '../utils/logger.js';

export const connect = async () => {
  try {
    await mongoose.connect(config.mongodbUri);
    logger.info('Connected to MongoDB ✅');
  } catch (error) {
    logger.error('MongoDB connection error:', error);
    throw error;
  }
};

export const disconnect = async () => {
  try {
    await mongoose.disconnect();
    logger.info('Disconnected from MongoDB');
  } catch (error) {
    logger.error('MongoDB disconnection error:', error);
    throw error;
  }
};
