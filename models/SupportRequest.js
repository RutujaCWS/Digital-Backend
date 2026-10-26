const mongoose = require('mongoose');

const supportRequestSchema = new mongoose.Schema({
  ticketNumber: { type: String, unique: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userName: String,
  userEmail: String,
  userPhone: String,

  // 🎯 Issue Name
  issueName: { type: String, required: true },

  // 📋 Issue Type
  issueType: {
    type: String,
    enum: [
      'Networking',
      'Computer Repair',
      'Software Installation',
      'Hardware Issue',
      'Printer Issue',
      'CCTV Installation',
      'AMC Service',
      'Other'
    ],
    default: 'Other',
    required: true
  },

  description: { type: String, required: true },

  // 📞 Contact Number (nava)
  contactNumber: { type: String, required: true },

  // 🏠 Address
  address: { type: String, required: true },

  // 📅 Expected Visit Date
  expectedVisitDate: { type: Date, required: true },

  status: {
    type: String,
    enum: ['Open', 'Assigned', 'In Progress', 'Resolved', 'Closed', 'Rejected'],
    default: 'Open'
  },

  triagedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  triagedByName: String,
  triagedAt: Date,

  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  assignedToName: String,
  assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  assignedAt: Date,

  resolution: String,
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  resolvedAt: Date,

  messages: [{
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    senderName: String,
    senderRole: String,
    message: String,
    at: { type: Date, default: Date.now }
  }],

  history: [{
    action: String,
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    byName: String,
    at: { type: Date, default: Date.now },
    note: String
  }]
}, { timestamps: true });

supportRequestSchema.pre('save', function () {
  if (!this.ticketNumber) {
    this.ticketNumber = 'TKT-' + Date.now().toString().slice(-8);
  }
});

module.exports = mongoose.model('SupportRequest', supportRequestSchema);