// routes/whatsappRoutes.js
const express = require('express');
const router = express.Router();
const { auth, requireRole } = require('../middleware/auth');
const {
  startWhatsApp,
  getStatus,
  logout,
  sendWhatsAppMessage
} = require('../services/whatsappService');

router.post('/connect', auth, requireRole('admin'), async (req, res) => {
  try {
    await startWhatsApp();
    res.json({ ok: true, status: getStatus() });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.get('/status', auth, requireRole('admin'), (req, res) => {
  res.json(getStatus());
});

router.post('/logout', auth, requireRole('admin'), async (req, res) => {
  try {
    await logout();
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// ✅ Test message
router.post('/test', auth, requireRole('admin'), async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ message: 'phone required' });

    const ok = await sendWhatsAppMessage(
      phone,
      `✅ Test message from your store.\n\nWhatsApp connection is working!`
    );
    res.json({
      success: ok,
      message: ok ? 'Message sent' : 'WhatsApp not connected'
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;