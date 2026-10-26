const express = require('express');
const os = require('os');
const mongoose = require('mongoose');
const User = require('../models/User');
const Order = require('../models/Order');
const Product = require('../models/Product');
const AuditLog = require('../models/AuditLog');
const { auth, requireRole } = require('../middleware/auth');
const router = express.Router();

// Health
router.get('/health', auth, requireRole('network', 'admin'), async (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatus = ['disconnected', 'connected', 'connecting', 'disconnecting'][dbState];
  const mem = process.memoryUsage();

  res.json({
    server: {
      uptime: process.uptime(),
      platform: os.platform(),
      hostname: os.hostname(),
      cpuCount: os.cpus().length,
      loadAvg: os.loadavg(),
      totalMem: os.totalmem(),
      freeMem: os.freemem(),
      memoryUsage: {
        rss: (mem.rss / 1024 / 1024).toFixed(2) + ' MB',
        heapUsed: (mem.heapUsed / 1024 / 1024).toFixed(2) + ' MB'
      }
    },
    database: { status: dbStatus, host: mongoose.connection.host },
    timestamp: new Date()
  });
});

// Stats
router.get('/stats', auth, requireRole('network', 'admin'), async (req, res) => {
  const [users, staff, products, orders] = await Promise.all([
    User.countDocuments({ role: 'user' }),
    User.countDocuments({ role: { $in: ['backoffice', 'network', 'admin'] } }),
    Product.countDocuments(),
    Order.countDocuments()
  ]);
  res.json({ users, staff, products, orders });
});

// Logs
router.get('/logs', auth, requireRole('network', 'admin'), async (req, res) => {
  const { limit = 100 } = req.query;
  const logs = await AuditLog.find()
    .sort('-createdAt')
    .limit(+limit)
    .populate('user', 'name email role');
  res.json(logs);
});

// Users list
router.get('/users', auth, requireRole('network', 'admin'), async (req, res) => {
  const users = await User.find()
    .select('name email role isActive lastLogin createdAt')
    .sort('-lastLogin');
  res.json(users);
});

// Toggle user active
router.put('/users/:id/toggle', auth, requireRole('network', 'admin'), async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: 'Not found' });
  if (user.role === 'admin') return res.status(403).json({ message: 'Cannot disable admin' });

  user.isActive = !user.isActive;
  await user.save();

  await AuditLog.create({
    user: req.user.id, userName: req.user.name, role: req.user.role,
    action: user.isActive ? 'USER_ENABLE' : 'USER_DISABLE',
    resource: 'User', resourceId: user._id
  });

  res.json({ message: `User ${user.isActive ? 'enabled' : 'disabled'}`, user });
});

module.exports = router;