const express = require('express');
const ContactMessage = require('../models/ContactMessage');
const { auth, requireRole } = require('../middleware/auth');
const router = express.Router();

// PUBLIC — Submit contact form
router.post('/', async (req, res) => {
  try {
    const { fullName, email, phone, enquiryType, message } = req.body;

    if (!fullName || !email || !phone || !enquiryType || !message) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: 'Invalid email address' });
    }

    if (!/^[6-9]\d{9}$/.test(phone.replace(/\D/g, ''))) {
      return res.status(400).json({ message: 'Invalid Indian mobile number' });
    }

    // Duplicate check — same email + message in last 5 mins
    const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000);
    const duplicate = await ContactMessage.findOne({
      email: email.toLowerCase(),
      message: message.trim(),
      createdAt: { $gte: fiveMinsAgo }
    });

    if (duplicate) {
      return res.status(429).json({
        message: 'You already sent a similar message recently. Please wait before submitting again.'
      });
    }

    const contact = await ContactMessage.create({
      fullName: fullName.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      enquiryType,
      message: message.trim()
    });

    res.status(201).json({
      message: 'Your message has been sent successfully',
      contact
    });
  } catch (err) {
    console.error('Contact submit error:', err);
    res.status(500).json({ message: err.message });
  }
});

// ADMIN — Get all messages
router.get('/', auth, requireRole('admin'), async (req, res) => {
  try {
    const { status, enquiryType } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (enquiryType) filter.enquiryType = enquiryType;

    const messages = await ContactMessage.find(filter).sort('-createdAt');
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ADMIN — Stats
router.get('/stats', auth, requireRole('admin'), async (req, res) => {
  try {
    const [total, newCount, readCount, repliedCount, closedCount] = await Promise.all([
      ContactMessage.countDocuments(),
      ContactMessage.countDocuments({ status: 'New' }),
      ContactMessage.countDocuments({ status: 'Read' }),
      ContactMessage.countDocuments({ status: 'Replied' }),
      ContactMessage.countDocuments({ status: 'Closed' })
    ]);
    res.json({ total, new: newCount, read: readCount, replied: repliedCount, closed: closedCount });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ADMIN — Update status + admin note
router.put('/:id/status', auth, requireRole('admin'), async (req, res) => {
  try {
    const { status, adminNote } = req.body;
    const update = {};
    if (status) update.status = status;
    if (adminNote !== undefined) update.adminNote = adminNote;
    if (status === 'Replied') {
      update.repliedAt = new Date();
      update.repliedBy = req.user.id;
    }

    const msg = await ContactMessage.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true }
    );
    res.json(msg);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ADMIN — Delete
router.delete('/:id', auth, requireRole('admin'), async (req, res) => {
  try {
    await ContactMessage.findByIdAndDelete(req.params.id);
    res.json({ message: 'Message deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;