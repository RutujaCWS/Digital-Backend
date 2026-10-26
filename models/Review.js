const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: { type: String, required: true },
  email: { type: String, required: true },
  city: { type: String, default: '' },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, required: true, maxlength: 500, trim: true },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

// ❌ Unique index KADHA — multiple reviews allowed
// reviewSchema.index({ user: 1 }, { unique: true });  ← delete kara

module.exports = mongoose.model('Review', reviewSchema);