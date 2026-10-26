const mongoose = require('mongoose');

const contactMessageSchema = new mongoose.Schema({
  fullName: { type: String, required: true, trim: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  phone: { type: String, required: true, trim: true },
  enquiryType: {
    type: String,
    required: true,
    enum: [
      'Laptop / Desktop Enquiry',
      'Product Availability',
      'Computer Repair',
      'Printer Setup / Installation',
      'CCTV Installation',
      'Home Visit / Technical Support',
      'Order / Delivery Issue',
      'Warranty / Service',
      'Other'
    ]
  },
  message: { type: String, required: true, trim: true },
  status: {
    type: String,
    enum: ['New', 'Read', 'Replied', 'Closed'],
    default: 'New'
  },
  adminNote: { type: String, default: '' },
  repliedAt: Date,
  repliedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('ContactMessage', contactMessageSchema);