const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { auth } = require('../middleware/auth');
const router = express.Router();

const sign = (user) => jwt.sign(
  { id: user._id, role: user.role, name: user.name, email: user.email },
  process.env.JWT_SECRET,
  { expiresIn: '7d' }
);

// ═══════════════════════════════════════════
// REGISTER — Name, Mobile, Address, Email, Password, ConfirmPassword
// ═══════════════════════════════════════════
router.post('/register', async (req, res) => {
  try {
    const {
      name, email, password, confirmPassword,
      phone, address
    } = req.body;

    // Validation
    if (!name || !email || !password || !phone) {
      return res.status(400).json({ message: 'All required fields must be filled' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    // Phone validation (10 digits)
    if (!/^\d{10}$/.test(phone.replace(/\D/g, ''))) {
      return res.status(400).json({ message: 'Invalid phone number (10 digits required)' });
    }

    // Email already exists?
    if (await User.findOne({ email })) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    // Hash password
    const hashed = await bcrypt.hash(password, 10);

    // Create user
    const user = await User.create({
      name,
      email,
      password: hashed,
      phone,
      address: address || '',
      role: 'user'
    });

    res.json({
      token: sign(user),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ═══════════════════════════════════════════
// LOGIN
// ═══════════════════════════════════════════
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });
    if (!user.isActive) return res.status(403).json({ message: 'Account disabled. Contact admin.' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: 'Invalid credentials' });

    user.lastLogin = new Date();
    await user.save();

    await AuditLog.create({
      user: user._id, userName: user.name, role: user.role,
      action: 'LOGIN', resource: 'Auth', ip: req.ip
    });

    res.json({
      token: sign(user),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET PROFILE
router.get('/me', auth, async (req, res) => {
  const user = await User.findById(req.user.id).select('-password');
  res.json(user);
});

// UPDATE PROFILE
router.put('/profile', auth, async (req, res) => {
  try {
    const { name, phone, address } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'Not found' });

    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (address !== undefined) user.address = address;

    await user.save();
    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      address: user.address,
      role: user.role
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ═══════════════════════════════════════════
// 🔐 FORGOT PASSWORD — STEP 1: Verify Email
// ═══════════════════════════════════════════
router.post('/verify-email', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      return res.status(404).json({
        message: 'This email is not registered. Please check or register a new account.'
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        message: 'Your account is disabled. Please contact admin.'
      });
    }

    res.json({
      success: true,
      message: 'Email verified. Please enter your new password.',
      name: user.name
    });
  } catch (err) {
    console.error('Verify email error:', err);
    res.status(500).json({ message: err.message });
  }
});

// ═══════════════════════════════════════════
// 🔐 FORGOT PASSWORD — STEP 2: Reset Password
// ═══════════════════════════════════════════
router.post('/reset-password', async (req, res) => {
  try {
    const { email, newPassword, confirmPassword } = req.body;

    if (!email || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        message: 'Password must be at least 6 characters'
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.isActive) {
      return res.status(403).json({
        message: 'Your account is disabled. Please contact admin.'
      });
    }

    // Hash new password
    const hashed = await bcrypt.hash(newPassword, 10);
    user.password = hashed;
    await user.save();

    await AuditLog.create({
      user: user._id,
      userName: user.name,
      role: user.role,
      action: 'PASSWORD_RESET',
      resource: 'Auth',
      ip: req.ip
    });

    res.json({
      success: true,
      message: 'Password reset successfully. You can now login with your new password.'
    });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ message: err.message });
  }
});
module.exports = router;