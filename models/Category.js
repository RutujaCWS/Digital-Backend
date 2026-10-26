const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  icon: { type: String, default: '📦' },
  color: { type: String, default: '#e3f2fd' },
  image: { type: String, default: '' },        // Optional category image
  description: { type: String, default: '' },
  order: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Category', categorySchema);