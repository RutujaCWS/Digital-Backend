const mongoose = require('mongoose');

const ROLES = ['user', 'backoffice', 'network', 'admin'];

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  phone: { type: String, required: true },       // 📱 Mobile
  address: { type: String, default: '' },         // 🏠 Address (single field)
  role: { type: String, enum: ROLES, default: 'user' },
  department: String,
  employeeId: { type: String, unique: true, sparse: true },
  isActive: { type: Boolean, default: true },
  lastLogin: Date,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
module.exports.ROLES = ROLES;