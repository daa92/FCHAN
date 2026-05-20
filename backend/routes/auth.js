const express = require('express');
const router = express.Router();
const {
  register,
  login,
  getMe,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
  deleteAccount,
  updateProfile,
  changePasswordHandler
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

// POST /api/auth/resend-verification
router.post('/resend-verification', resendVerification);

// ─── PROTECTED ROUTES ─────────────────────────────────
// (token required)

// GET /api/auth/verify?token=xxx
router.get('/verify', verifyEmail);

// GET /api/auth/me
router.get('/me', auth, getMe); // This means: before running getMe, run auth first. If token is invalid → stops here and returns 401. If valid → continues to getMe.


// DELETE /api/auth/account (protected)
router.delete('/account', auth, deleteAccount);


// PUT /api/auth/profile
router.put('/profile', auth, updateProfile);

// PUT /api/auth/change-password
router.put('/change-password', auth, changePasswordHandler);

module.exports = router;
