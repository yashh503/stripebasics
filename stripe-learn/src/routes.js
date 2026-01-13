import express from 'express';
import authRoutes from './modules/auth/auth.route.js';
import healthRoutes from './modules/health/health.route.js';
import stripeRoutes from './modules/stripe/stripe.route.js'

const router = express.Router();

// Health check
router.use('/health', healthRoutes);

// Auth routes
router.use('/auth', authRoutes);

//stripe
router.use('/stripe', stripeRoutes);


export default router;
