const express = require('express');
const SupportRequest = require('../models/SupportRequest');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { auth, requireRole } = require('../middleware/auth');
const { sendWhatsAppMessage } = require('../services/whatsappService');
const SiteSettings = require('../models/SiteSettings');
const router = express.Router();

// USER: Create ticket
router.post('/', auth, async (req, res) => {
  try {
    const { issueName, issueType, description, contactNumber, address, expectedVisitDate } = req.body;

    if (!issueName || !issueType || !description || !contactNumber || !address || !expectedVisitDate) {
      return res.status(400).json({
        message: 'All fields required: issueName, issueType, description, contactNumber, address, expectedVisitDate'
      });
    }

    const user = await User.findById(req.user.id);

    const ticket = await SupportRequest.create({
      user: req.user.id,
      userName: req.user.name || user?.name,
      userEmail: req.user.email || user?.email,
      userPhone: user?.phone || '',
      issueName,
      issueType,
      description,
      contactNumber,
      address,
      expectedVisitDate: new Date(expectedVisitDate),
      messages: [{
        sender: req.user.id,
        senderName: req.user.name,
        senderRole: req.user.role,
        message: description
      }],
      history: [{
        action: 'CREATED',
        by: req.user.id,
        byName: req.user.name
      }]
    });

    // Notify Admin and Backoffice about the new support request
    try {
      const recipients = await User.find({
        role: { $in: ['admin', 'backoffice'] },
        isActive: true
      }).select('_id');

      await Notification.insertMany(
        recipients.map((recipient) => ({
          user: recipient._id,
          type: 'Support Request',
          message: `New support request "${ticket.issueName}" created by ${ticket.userName || 'a customer'}.`,
          link: recipient.role === 'admin' ? '/admin/support' : '/backoffice/support'
        }))
      );

      console.log('Support request notifications sent to Admin and Backoffice');
    } catch (notificationError) {
      console.error('Support notification error:', notificationError);
    }

    res.status(201).json(ticket);
  } catch (err) {
    console.error('Support create error:', err);
    res.status(500).json({ message: err.message });
  }
});

// USER: My tickets
router.get('/my', auth, async (req, res) => {
  try {
    const tickets = await SupportRequest.find({ user: req.user.id })
      .populate('assignedTo', 'name phone') // ✅ इंजिनियरचा फोन नंबर आणा
      .sort('-createdAt');

    // ✅ जुन्या आणि नवीन टिकीट्ससाठी फोन नंबर सेट करा
    const updatedTickets = tickets.map(t => {
      const tObj = t.toObject();
      // जर इंजिनियर असेल आणि त्याचा फोन नंबर असेल, तर तो assignedToPhone मध्ये टाका
      if (tObj.assignedTo && tObj.assignedTo.phone) {
        tObj.assignedToPhone = tObj.assignedTo.phone;
      }
      return tObj;
    });

    res.json(updatedTickets);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
// BACKOFFICE/ADMIN: Triage list
router.get('/triage', auth, requireRole('backoffice', 'admin'), async (req, res) => {
  const { status } = req.query;
  const filter = status ? { status } : { status: 'Open' };
  const tickets = await SupportRequest.find(filter).sort('-createdAt');
  res.json(tickets);
});

// NETWORK/ADMIN: Assigned tickets
router.get('/assigned', auth, requireRole('network', 'admin'), async (req, res) => {
  const filter = req.user.role === 'admin'
    ? { assignedTo: { $exists: true } }
    : { assignedTo: req.user.id };
  const tickets = await SupportRequest.find(filter).sort('-createdAt');

  res.json(tickets);
});

// ADMIN: All tickets
router.get('/all', auth, requireRole('admin'), async (req, res) => {
  const { status, issueType } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (issueType) filter.issueType = issueType;
  const tickets = await SupportRequest.find(filter)
    .populate('assignedTo', 'name email role')
    .sort('-createdAt');
  res.json(tickets);
});

// Single ticket
router.get('/:id', auth, async (req, res) => {
  const ticket = await SupportRequest.findById(req.params.id)
    .populate('user', 'name email phone')
    .populate('assignedTo', 'name email role');

  if (!ticket) return res.status(404).json({ message: 'Not found' });

  const { role, id } = req.user;
  const isOwner = ticket.user._id.toString() === id;
  const isStaff = ['backoffice', 'network', 'admin'].includes(role);
  const isAssigned = ticket.assignedTo?._id?.toString() === id;

  if (!isOwner && !isStaff && !isAssigned) {
    return res.status(403).json({ message: 'Not authorized' });
  }
  res.json(ticket);
});

// EDIT
router.put('/:id', auth, async (req, res) => {
  try {
    const ticket = await SupportRequest.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: 'Not found' });

    const { role, id } = req.user;
    const isOwner = ticket.user.toString() === id;
    const isAdmin = role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Not authorized to edit' });
    }

    if (isOwner && !isAdmin && ticket.status !== 'Open') {
      return res.status(400).json({ message: 'Cannot edit - ticket already processed' });
    }

    const { issueName, issueType, description, contactNumber, address, expectedVisitDate } = req.body;

    if (issueName) ticket.issueName = issueName;
    if (issueType) ticket.issueType = issueType;
    if (description) ticket.description = description;
    if (contactNumber) ticket.contactNumber = contactNumber;
    if (address) ticket.address = address;
    if (expectedVisitDate) ticket.expectedVisitDate = new Date(expectedVisitDate);

    ticket.history.push({
      action: 'EDITED',
      by: req.user.id,
      byName: req.user.name,
      note: isAdmin ? 'Edited by admin' : 'Edited by user'
    });

    await ticket.save();
    res.json({ message: 'Ticket updated', ticket });
  } catch (err) {
    console.error('Edit error:', err);
    res.status(500).json({ message: err.message });
  }
});

// DELETE
router.delete('/:id', auth, async (req, res) => {
  try {
    const ticket = await SupportRequest.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: 'Not found' });

    const { role, id } = req.user;
    const isOwner = ticket.user.toString() === id;
    const isAdmin = role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Not authorized to delete' });
    }

    if (isOwner && !isAdmin && ticket.status !== 'Open') {
      return res.status(400).json({ message: 'Cannot delete - ticket already processed' });
    }

    await Notification.deleteMany({
      $or: [
        { link: `/support-requests/${ticket._id}` },
        { link: `/support-requests/${ticket._id.toString()}` }
      ]
    });

    await SupportRequest.findByIdAndDelete(req.params.id);

    
    res.json({ message: 'Ticket deleted' });
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).json({ message: err.message });
  }
});

// Triage
router.put('/:id/triage', auth, requireRole('backoffice', 'admin'), async (req, res) => {
  const ticket = await SupportRequest.findById(req.params.id);
  if (!ticket) return res.status(404).json({ message: 'Not found' });

  ticket.triagedBy = req.user.id;
  ticket.triagedByName = req.user.name;
  ticket.triagedAt = new Date();
  ticket.history.push({ action: 'TRIAGED', by: req.user.id, byName: req.user.name });
  await ticket.save();
  res.json(ticket);
});

// Assign
router.put('/:id/assign', auth, requireRole('backoffice', 'admin'), async (req, res) => {
  const { networkEngineerId, note } = req.body;
  if (!networkEngineerId) return res.status(400).json({ message: 'Engineer ID required' });

  const engineer = await User.findById(networkEngineerId);
  if (!engineer || engineer.role !== 'network') {
    return res.status(400).json({ message: 'Invalid network engineer' });
  }

  const ticket = await SupportRequest.findById(req.params.id);
  if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

  ticket.assignedTo = engineer._id;
  ticket.assignedToName = engineer.name;
  ticket.assignedBy = req.user.id;
  ticket.assignedToPhone = engineer.phone || engineer.mobile || 'Not provided'; 
  ticket.assignedAt = new Date();
  ticket.status = 'Assigned';
  ticket.history.push({
    action: 'ASSIGNED',
    by: req.user.id,
    byName: req.user.name,
    note: `Assigned to ${engineer.name}${note ? ' — ' + note : ''}`
  });

  await ticket.save();

  // ✅ नवीन कोड: ॲसाइन झाल्यावर नोटिफिकेशन
  try {
    const engineerPhone = engineer.phone || engineer.mobile || 'Not provided';

    await Notification.insertMany([
      {
        user: engineer._id,
        type: 'Support Request',
        message: `A support request "${ticket.issueName}" has been assigned to you.`,
        link: '/network-support' 
      },
      {
        user: ticket.user, 
        type: 'Support Request',
        message: `Your support request "${ticket.issueName}" has been assigned to Network Engineer ${engineer.name}. Mobile: ${engineerPhone}.`,
        link: '/my-support'
      }
    ]);
    console.log('Assignment notifications sent');
  } catch (notificationError) {
    console.error('Assignment notification error:', notificationError);
  }


  // ✅ NEW: Customer ला WhatsApp message पाठवा
  try {
    const settings = await SiteSettings.findOne().select('companyName');
    const shopName = settings?.companyName || 'Our Store';

    const engineerPhone = engineer.phone || engineer.mobile || 'Not provided';

    const waMessage =
      `Hello *${ticket.userName || 'Customer'}*,\n\n` +
      `Your support request *"${ticket.issueName}"* has been assigned to our Network Engineer.\n\n` +
      `*Engineer Details:*\n` +
      `Name: *${engineer.name}*\n` +
      `Mobile: *${engineerPhone}*\n\n` +
      `*Ticket ID:* ${ticket._id}\n` +
      `*Expected Visit:* ${ticket.expectedVisitDate ? new Date(ticket.expectedVisitDate).toLocaleDateString('en-IN') : 'Soon'}\n\n` +
      `Our engineer will contact you shortly.\n\n` +
      `Thank you for choosing *${shopName}*! 🙏`;

    // Customer चा contact number वापरा (ticket.contactNumber किंवा userPhone)
    const customerPhone = ticket.contactNumber || ticket.userPhone;

    if (customerPhone) {
      sendWhatsAppMessage(customerPhone, waMessage)
        .then(sent => {
          if (sent) console.log(`✅ WhatsApp sent to customer ${customerPhone} for ticket ${ticket._id}`);
          else console.log(`⚠️ WhatsApp NOT sent for ticket ${ticket._id}`);
        })
        .catch(err => console.error(`❌ WhatsApp failed for ticket ${ticket._id}:`, err.message));
    } else {
      console.log('⚠️ No customer phone found for WhatsApp');
    }
  } catch (err) {
    console.error('❌ WhatsApp assign error:', err);
  }

  res.json(ticket);
});

// ═══════════════════════════════════════════
// STATUS UPDATE — ADMIN has full control
// ═══════════════════════════════════════════
router.put('/:id/status', auth, requireRole('network', 'admin'), async (req, res) => {
  try {
    const { status, note } = req.body;

    if (!status) {
      return res.status(400).json({ message: 'Status required' });
    }

    const ticket = await SupportRequest.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: 'Not found' });

    // Network engineer: only own assigned tickets, limited statuses
    if (req.user.role === 'network') {
      if (ticket.assignedTo?.toString() !== req.user.id) {
        return res.status(403).json({ message: 'Not assigned to you' });
      }
      const allowed = ['In Progress', 'Resolved', 'Closed'];
      if (!allowed.includes(status)) {
        return res.status(400).json({ message: 'Invalid status for network engineer' });
      }
    }

    // Admin: any status
    if (req.user.role === 'admin') {
      const allowed = [
        'Open', 'Assigned', 'In Progress', 'Resolved', 'Closed', 'Rejected'
      ];
      if (!allowed.includes(status)) {
        return res.status(400).json({ message: 'Invalid status' });
      }
    }

    // Update status
    ticket.status = status;

    if (status === 'Resolved') {
      ticket.resolvedBy = req.user.id;
      ticket.resolvedAt = new Date();
      if (note) ticket.resolution = note;
    }

    ticket.history.push({
      action: `STATUS_${status.toUpperCase().replace(' ', '_')}`,
      by: req.user.id,
      byName: req.user.name,
      note: note || `Status changed to ${status}`
    });

    await ticket.save();
    res.json(ticket);
  } catch (err) {
    console.error('Status update error:', err);
    res.status(500).json({ message: err.message });
  }
});

// Message
router.post('/:id/message', auth, async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ message: 'Message required' });

  const ticket = await SupportRequest.findById(req.params.id);
  if (!ticket) return res.status(404).json({ message: 'Not found' });

  const { role, id } = req.user;
  const isOwner = ticket.user.toString() === id;
  const isStaff = ['backoffice', 'network', 'admin'].includes(role);
  const isAssigned = ticket.assignedTo?.toString() === id;

  if (!isOwner && !isStaff && !isAssigned) {
    return res.status(403).json({ message: 'Not authorized' });
  }

  ticket.messages.push({
    sender: req.user.id,
    senderName: req.user.name,
    senderRole: req.user.role,
    message
  });

  await ticket.save();
  res.json(ticket);
});

// Stats
router.get('/admin/stats', auth, requireRole('admin', 'backoffice'), async (req, res) => {
  const [open, assigned, inProgress, resolved] = await Promise.all([
    SupportRequest.countDocuments({ status: 'Open' }),
    SupportRequest.countDocuments({ status: 'Assigned' }),
    SupportRequest.countDocuments({ status: 'In Progress' }),
    SupportRequest.countDocuments({ status: 'Resolved' })
  ]);
  res.json({ open, assigned, inProgress, resolved });
});

module.exports = router;