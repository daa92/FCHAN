const { verifyEmail } = require('../controllers/authController');
const express = require('express');
const router = express.Router();
const {
  register,
  login,
  getMe,
  forgotPassword,
  resetPassword
} = require('../controllers/authController');
const { auth } = require('../middleware/auth');

// ─── PUBLIC ROUTES ────────────────────────────────────
// (no token required)

// POST /api/auth/register
router.post('/register', register);

// POST /api/auth/login
router.post('/login', login);

// POST /api/auth/forgot-password
router.post('/forgot-password', forgotPassword);

// POST /api/auth/reset-password
router.post('/reset-password', resetPassword);

// ─── PROTECTED ROUTES ─────────────────────────────────
// (token required)

// GET /api/auth/verify?token=xxx
router.get('/verify', verifyEmail);

// GET /api/auth/me
router.get('/me', auth, getMe); // This means: before running getMe, run auth first. If token is invalid → stops here and returns 401. If valid → continues to getMe.

module.exports = router;
