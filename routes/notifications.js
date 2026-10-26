const express = require('express');
const Notification = require('../models/Notification');
const { auth } = require('../middleware/auth');
const router = express.Router();

// GET — User notifications
router.get('/:userId', auth, async (req, res) => {
  try {
    const notifications = await Notification.find({
      user: req.params.userId
    }).sort({ createdAt: -1 }).limit(20);
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
// PUT — Mark as read
router.put('/:id/read', auth, async (req, res) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, { isRead: true });
    res.json({ message: 'Marked as read' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;