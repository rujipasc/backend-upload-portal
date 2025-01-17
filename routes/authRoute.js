const express = require('express');
const router = express.Router();
const {
  login,
  logout,
  changePassword,
  forgetPassword,
  resetPassword
} = require('../controller/authController');
const {
  verifyAccessToken,
  refreshTokenMiddleware,
  checkRole,
} = require('../middlewares/auth');
const rateLimit = require('express-rate-limit');

const baseLimiterOptions = {
  standardHeaders: true,
  legacyHeaders: true,
  keyGenerator: (req) => {
    // Consider using multiple factors for key generation
    return `${req.ip}-${req.headers['user-agent']}`;
  },
  handler: (req, res) => {
    res.status(429).json({
      status: 'error',
      message: 'Too many requests, please try again later'
    });
  },
  skipFailedRequests: false
};

const loginLimiter = rateLimit({
  ...baseLimiterOptions,
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    status: 'error',
    message: 'Too many login attempts, please try again after 15 minutes'
  },
  skipSuccessfulRequests: true,
});

const forgetPasswordLimiter = rateLimit({
  ...baseLimiterOptions,
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    status: 'error',
    message: 'Too many forget password attempts, please try again after 15 minutes'
  }
});

const resetPasswordLimiter = rateLimit({
  ...baseLimiterOptions,
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: {
    status: 'error',
    message: 'Too many reset password attempts, please try again after 1 hour'
  }
});
// Authentication routes
router.post('/login', loginLimiter, login);
router.post('/logout', verifyAccessToken, logout);
router.post('/refresh-token', refreshTokenMiddleware, (req, res) => {
  res.json({
    status: 'success',
    ...req.tokens
  });
});
router.post('/forget-password', forgetPasswordLimiter, forgetPassword);
router.post('/reset-password', resetPasswordLimiter, resetPassword);
router.post('/change-password/:userId', verifyAccessToken, checkRole(['admin', 'systemAdmin']), changePassword);

module.exports = router;