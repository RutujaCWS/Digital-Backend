const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { sendWhatsAppMessage } = require('../services/whatsappService');
const SiteSettings = require('../models/SiteSettings');
const { auth, requireRole } = require('../middleware/auth');
const router = express.Router();

// Get all staff
router.get('/', auth, requireRole('admin'), async (req, res) => {
  const staff = await User.find({ role: { $in: ['backoffice', 'network', 'admin'] } })
    .select('-password')
    .populate('createdBy', 'name email')
    .sort('-createdAt');
  res.json(staff);
});

// Add staff
router.post('/', auth, requireRole('admin'), async (req, res) => {
  try {
    const { name, email, password, role, phone, department } = req.body;

    const allowed = ['backoffice', 'network'];
    if (!allowed.includes(role)) {
      return res.status(400).json({ message: 'Invalid role. Allowed: backoffice, network' });
    }

    if (await User.findOne({ email })) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    if (!phone) {
      return res.status(400).json({ message: 'Phone number required for staff' });
    }
    
    const prefix = role === 'backoffice' ? 'BO' : 'NE';
    const count = await User.countDocuments({ role });
    const employeeId = `${prefix}-${String(count + 1001).padStart(4, '0')}`;

    const hashed = await bcrypt.hash(password, 10);
    const staff = await User.create({
      name, email, password: hashed, role,
      phone, department, employeeId,
      createdBy: req.user.id
    });

    await AuditLog.create({
      user: req.user.id, userName: req.user.name, role: req.user.role,
      action: 'STAFF_CREATE', resource: 'User', resourceId: staff._id,
      details: { name, email, role, employeeId }
    });

    // ✅ NEW: Staff ला WhatsApp message पाठवा (ID + Password सह)
    try {
      const settings = await SiteSettings.findOne().select('companyName');
      const shopName = settings?.companyName || 'Our Store';
      const roleLabel = role === 'backoffice' ? 'Back Office Staff' : 'Network Engineer';

      const waMessage =
        `Hello *${name}*,\n\n` +
        `Welcome to *${shopName}*! 🎉\n\n` +
        `Your account has been created as *${roleLabel}*.\n\n` +
        `*Login Details:*\n` +
        `Employee ID: *${employeeId}*\n` +
        `Email: *${email}*\n` +
        `Password: *${password}*\n` +
        `Role: ${roleLabel}\n\n` +
        `Thank you,\n` +
        `*${shopName}* Team`;

      sendWhatsAppMessage(phone, waMessage)
        .then(sent => {
          if (sent) console.log(`✅ WhatsApp sent to ${name} (${phone}) with login details`);
          else console.log(`⚠️ WhatsApp NOT sent to ${phone}`);
        })
        .catch(err => console.error(`❌ WhatsApp failed for ${phone}:`, err.message));
    } catch (waErr) {
      console.error('❌ WhatsApp send error:', waErr);
    }


    res.status(201).json({
      message: `${role === 'backoffice' ? 'Back Office' : 'Network Engineer'} added`,
      staff: { id: staff._id, name, email, role, employeeId, department }
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Update staff
router.put('/:id', auth, requireRole('admin'), async (req, res) => {
  try {
    const { name, phone, department, role, isActive, password } = req.body;
    const staff = await User.findById(req.params.id);
    if (!staff) return res.status(404).json({ message: 'Not found' });
    if (staff.role === 'admin') return res.status(403).json({ message: 'Cannot edit admin' });

    if (name) staff.name = name;
    if (phone !== undefined) staff.phone = phone;
    if (department) staff.department = department;
    if (typeof isActive === 'boolean') staff.isActive = isActive;
    if (role && ['backoffice', 'network'].includes(role)) staff.role = role;
    if (password) staff.password = await bcrypt.hash(password, 10);

    await staff.save();
    res.json({ message: 'Staff updated', staff });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Toggle active status (enable/disable)
router.put('/:id/toggle', auth, requireRole('admin'), async (req, res) => {
  try {
    const staff = await User.findById(req.params.id);
    if (!staff) return res.status(404).json({ message: 'Not found' });
    if (staff.role === 'admin') return res.status(403).json({ message: 'Cannot modify admin' });

    staff.isActive = !staff.isActive;
    await staff.save();

    await AuditLog.create({
      user: req.user.id, userName: req.user.name, role: req.user.role,
      action: staff.isActive ? 'STAFF_ENABLE' : 'STAFF_DISABLE',
      resource: 'User', resourceId: staff._id
    });

    res.json({
      message: `Staff ${staff.isActive ? 'enabled' : 'disabled'}`,
      staff
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Deactivate (old route — kept for backwards compatibility)
router.delete('/:id', auth, requireRole('admin'), async (req, res) => {
  const staff = await User.findById(req.params.id);
  if (!staff) return res.status(404).json({ message: 'Not found' });
  if (staff.role === 'admin') return res.status(403).json({ message: 'Cannot delete admin' });

  staff.isActive = false;
  await staff.save();
  res.json({ message: 'Staff deactivated' });
});

// Permanent delete
router.delete('/:id/permanent', auth, requireRole('admin'), async (req, res) => {
  const staff = await User.findById(req.params.id);
  if (!staff) return res.status(404).json({ message: 'Not found' });
  if (staff.role === 'admin') return res.status(403).json({ message: 'Cannot delete admin' });

  await User.findByIdAndDelete(req.params.id);
  res.json({ message: 'Staff permanently deleted' });
});

// Stats
router.get('/meta/stats', auth, requireRole('admin'), async (req, res) => {
  const stats = await User.aggregate([
    { $match: { role: { $in: ['backoffice', 'network', 'admin'] } } },
    { $group: { _id: '$role', count: { $sum: 1 } } }
  ]);
  const result = { admin: 0, backoffice: 0, network: 0 };
  stats.forEach(s => { result[s._id] = s.count; });
  res.json(result);
});

// Network engineers (for assignment dropdown)
router.get('/meta/network-engineers', auth, requireRole('backoffice', 'admin'), async (req, res) => {
  const engineers = await User.find({ role: 'network', isActive: true })
    .select('name email employeeId department');
  res.json(engineers);
});

module.exports = router;