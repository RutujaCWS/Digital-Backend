const mongoose = require('mongoose');

const specialOfferSchema = new mongoose.Schema({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  description: { type: String, default: '' },

  offerType: {
    type: String,
    enum: ['flat', 'percentage'],
    default: 'flat'
  },

  discountValue: { type: Number, required: true, default: 0 },
  maxDiscount: { type: Number, default: 0 },

  minOrderAmount: { type: Number, default: 0 },
  minProductPrice: { type: Number, default: 0 },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },

  appliesTo: {
    type: String,
    enum: ['all', 'category', 'brand', 'products'],
    default: 'all'
  },
  categories: [String],
  brands: [String],
  products: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],

  excludedProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  excludedCategories: [String],
  excludedBrands: [String],

  badge: { type: String, default: '🎉 SPECIAL OFFER' },
  bannerImage: { type: String, default: '' },   // 🖼️ Cloudinary image URL

  isActive: { type: Boolean, default: true },

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('SpecialOffer', specialOfferSchema);