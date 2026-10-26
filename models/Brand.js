const mongoose = require('mongoose');

const brandSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  logo: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Brand', brandSchema);