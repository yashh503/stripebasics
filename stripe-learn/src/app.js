import express from 'express';
import expressLoader from './loaders/express.loader.js';

const app = express();

// Load express middlewares and routes
expressLoader(app);

export default app;
