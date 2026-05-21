const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendEmail, getAppUrl } = require('../services/email');
const crypto = require('crypto');
const db = require('../config/db');

// ─── REGISTER ─────────────────────────────────────────
const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email and password are required.'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format.'
      });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters.'
      });
    }

    // Check if email already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Email already registered.'
      });
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create the user
    const userId = await User.create({
      name,
      email,
      password: hashedPassword,
      role: role || 'farmer'
    });

    // Generate verification token
    const verifyToken = crypto.randomBytes(32).toString('hex');
    const verifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Save token to database
    await User.setResetToken(email, verifyToken, verifyExpires);

    // Send verification email
    await sendEmail(email, 'verification', name, verifyToken, getAppUrl(req));

    // Generate JWT token
    const token = jwt.sign(
      { id: userId, email, role: role || 'farmer' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    return res.status(201).json({
  	success: true,
  	message: 'Registration successful. Please check your email to verify your account.',
  	token,
  	user: {
    		id: userId,
    		name,
    		email,
    		role: role || 'farmer',
    		email_verified: false
  	}
    });

  } catch (err) {
    console.error('Register error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error.'
    });
  }
};

// ─── LOGIN ────────────────────────────────────────────
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.'
      });
    }

    // Find user by email
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    // Compare password with hashed password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }
    // Check if email is verified
    if (!user.email_verified) {
      return res.status(403).json({
      success: false,
      message: 'Please verify your email before logging in. Check your inbox.',
      email_verified: false,
      resend_available: true
    });
}

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (err) {
    console.error('Login error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error.'
    });
  }
};


const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required.'
      });
    }

    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(200).json({
        success: true,
        message: 'If that email exists, a verification link has been sent.'
      });
    }

    if (user.email_verified) {
      return res.status(400).json({
        success: false,
        message: 'Email is already verified.'
      });
    }

    // Generate new token
    const crypto = require('crypto');
    const verifyToken   = crypto.randomBytes(32).toString('hex');
    const verifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await User.setResetToken(email, verifyToken, verifyExpires);
    await sendEmail(email, 'verification', user.name, verifyToken, getAppUrl(req));

    return res.status(200).json({
      success: true,
      message: 'Verification email sent. Please check your inbox.'
    });

  } catch (err) {
    console.error('ResendVerification error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error.'
    });
  }
};


// ─── GET CURRENT USER ─────────────────────────────────
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    return res.status(200).json({
      success: true,
      user
    });
  } catch (err) {
    console.error('GetMe error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error.'
    });
  }
};

// ─── FORGOT PASSWORD ──────────────────────────────────
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required.'
      });
    }

    const user = await User.findByEmail(email);

    // Always return success even if email not found
    // This prevents email enumeration attacks
    if (!user) {
      return res.status(200).json({
        success: true,
        message: 'If that email exists, a reset link has been sent.'
      });
    }

    // Generate reset token
    const resetToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
    const expires = new Date(Date.now() + 3600000); // 1 hour from now

    await User.setResetToken(email, resetToken, expires);

    // TODO: Send email with reset link in Phase 5
    console.log(`Reset token for ${email}: ${resetToken}`);

    return res.status(200).json({
      success: true,
      message: 'If that email exists, a reset link has been sent.'
    });

  } catch (err) {
    console.error('ForgotPassword error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error.'
    });
  }
};

// ─── RESET PASSWORD ───────────────────────────────────
const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({
        success: false,
        message: 'Token and new password are required.'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters.'
      });
    }

    // Find user by reset token
    const user = await User.findByResetToken(token);
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token.'
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Update password
    await User.updatePassword(user.id, hashedPassword);

    return res.status(200).json({
      success: true,
      message: 'Password reset successful. Please login.'
    });

  } catch (err) {
    console.error('ResetPassword error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error.'
    });
  }
};


const verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Verification token is required.'
      });
    }

    const user = await User.findByResetToken(token);
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification token.'
      });
    }

    await User.verifyEmail(user.id);
    await db.execute(
      'UPDATE users SET reset_token = NULL, reset_token_expires = NULL WHERE id = ?',
      [user.id]
    );

    return res.status(200).json({
      success: true,
      message: 'Email verified successfully! You can now login.'
    });

  } catch (err) {
    console.error('VerifyEmail error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error.'
    });
  }
};


const deleteAccount = async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password is required to delete your account.'
      });
    }

    // Get full user with password
    const user = await User.findByEmail(req.user.email);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect password.'
      });
    }

    // Delete account (cascades to farms, zones, plants, sensors etc.)
    await User.deleteAccount(req.user.id);

    return res.status(200).json({
      success: true,
      message: 'Account deleted successfully.'
    });

  } catch (err) {
    console.error('DeleteAccount error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error.'
    });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { name, email, avatar } = req.body;
    if (!name || !email) {
      return res.status(400).json({
        success: false, message: 'Name and email required.'
      });
    }

    // avatar is a base64 data URL (e.g. "data:image/jpeg;base64,...")
    // We allow null to clear it, or a string to set it
    if (avatar !== undefined) {
      await db.execute(
        'UPDATE users SET name = ?, email = ?, avatar = ? WHERE id = ?',
        [name, email, avatar || null, req.user.id]
      );
    } else {
      await db.execute(
        'UPDATE users SET name = ?, email = ? WHERE id = ?',
        [name, email, req.user.id]
      );
    }

    // Return updated user so frontend can refresh localStorage
    const [rows] = await db.execute(
      'SELECT id, name, email, role, email_verified, avatar FROM users WHERE id = ?',
      [req.user.id]
    );
    const updatedUser = rows[0] || {};

    return res.status(200).json({
      success: true,
      message: 'Profile updated.',
      user: updatedUser
    });
  } catch (err) {
    console.error('UpdateProfile error:', err.message);
    return res.status(500).json({
      success: false, message: 'Internal server error.'
    });
  }
};

const changePasswordHandler = async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) {
      return res.status(400).json({
        success: false, message: 'Both passwords required.'
      });
    }
    if (new_password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters.'
      });
    }
    const user = await User.findByEmail(req.user.email);
    const isMatch = await bcrypt.compare(current_password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false, message: 'Current password is incorrect.'
      });
    }
    const salt   = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(new_password, salt);
    await User.updatePassword(req.user.id, hashed);
    return res.status(200).json({
      success: true, message: 'Password changed successfully.'
    });
  } catch (err) {
    return res.status(500).json({
      success: false, message: 'Internal server error.'
    });
  }
};


module.exports = {
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
};
