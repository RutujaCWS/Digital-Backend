const mongoose = require('mongoose');

const gallerySchema = new mongoose.Schema({
  mediaType: {
    type: String,
    enum: ['image', 'video'],
    default: 'image',
    required: true
  },

  imageUrl: { type: String, default: '' },
  videoUrl: { type: String, default: '' },

  description: { type: String, default: '' },

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Gallery', gallerySchema);