import express from 'express';
import * as authController from './auth.controller.js';
import { validate, authenticate } from './auth.middleware.js';
import { registerSchema, loginSchema, refreshTokenSchema } from './auth.schema.js';

const router = express.Router();

// Public routes
router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.post('/refresh-token', validate(refreshTokenSchema), authController.refreshToken);

// Protected route example
router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

export default router;
