const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  userName: String,
  role: String,
  action: { type: String, required: true },
  resource: String,
  resourceId: String,
  details: Object,
  ip: String,
  userAgent: String
}, { timestamps: true });

module.exports = mongoose.model('AuditLog', auditLogSchema);