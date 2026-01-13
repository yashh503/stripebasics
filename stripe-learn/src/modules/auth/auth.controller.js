import * as authService from './auth.service.js';
import asyncHandler from '../../utils/asyncHandler.js';

export const register = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await authService.register(email, password);

  res.status(201).json({
    message: 'User registered successfully',
    user: result.user,
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
  });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await authService.login(email, password);

  res.json({
    message: 'Login successful',
    user: result.user,
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
  });
});

export const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken: token } = req.body;
  const result = await authService.refreshToken(token);

  res.json({
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
  });
});
