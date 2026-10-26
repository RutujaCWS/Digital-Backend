const mongoose = require('mongoose');

const heroSlideSchema = new mongoose.Schema({
  title: { type: String, default: '' },
  subtitle: { type: String, default: '' },
  imageUrl: { type: String, default: '' },
  ctaText: { type: String, default: 'Shop Now' },
  ctaLink: { type: String, default: '/' },
  order: { type: Number, default: 0 }
}, { _id: true });

const featureSchema = new mongoose.Schema({
  icon: { type: String, default: '✨' },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  color: { type: String, default: '#e3f2fd' },
  order: { type: Number, default: 0 }
}, { _id: true });

const siteSettingsSchema = new mongoose.Schema({
  companyName: { type: String, default: 'Digital World' },
  tagline: { type: String, default: 'The Computer Zone' },
  description: { type: String, default: '' },
  logoUrl: { type: String, default: '' },

  aboutStory: { type: String, default: '' },
  mission: { type: String, default: '' },
  vision: { type: String, default: '' },
  values: { type: String, default: '' },
  establishedYear: { type: String, default: '' },

  heroSlides: [heroSlideSchema],
  features: [featureSchema],

  address: {
    shopNo: { type: String, default: '' },
    street: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    pincode: { type: String, default: '' },
    country: { type: String, default: 'India' }
  },
  phone1: { type: String, default: '' },
  phone2: { type: String, default: '' },
  email1: { type: String, default: '' },
  email2: { type: String, default: '' },
  whatsapp: { type: String, default: '' },
  workingHours: { type: String, default: '' },
  gstNumber: { type: String, default: '' },

  facebook: { type: String, default: '' },
  instagram: { type: String, default: '' },
  twitter: { type: String, default: '' },
  youtube: { type: String, default: '' },
  linkedin: { type: String, default: '' },

  googleMapUrl: { type: String, default: '' },
  footerText: { type: String, default: '' },

  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('SiteSettings', siteSettingsSchema);