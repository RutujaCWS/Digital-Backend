const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  orderNumber: { type: String, unique: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    name: String, price: Number, quantity: Number, image: String,
    gst: Number,                 
    dealerRate: Number, 
    gifts: [{ name: String, value: Number }]
  }],
  shippingAddress: {
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true }
  },
  paymentMethod: { type: String, default: 'COD' },
  itemsPrice: Number,
  deliveryCharge: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
 
  appliedOffers: {
    type: [{
      offerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SpecialOffer',
        required: true
      },
      title: {
        type: String,
        default: 'Special Offer'
      },
      discount: {
        type: Number,
        default: 0
      },
      type: {
        type: String,
        enum: ['flat', 'percentage'],
        default: 'flat'
      }
    }],
    default: []
  },

  totalPrice: { type: Number, required: true },
  status: {
    type: String,
    enum: ['Pending', 'Confirmed', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled'],
    default: 'Pending'
  },
  statusHistory: [{
    status: String,
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    changedByName: String,
    at: { type: Date, default: Date.now },
    note: String
  }],
  isPaid: { type: Boolean, default: false },
  paidAt: Date,
  deliveredAt: Date
}, { timestamps: true });

// ✅ next काढून टाकला
orderSchema.pre('save', function () {
  if (!this.orderNumber) {
    this.orderNumber = 'FK-' + Date.now().toString().slice(-8) + '-' + Math.floor(Math.random() * 1000);
  }
});

module.exports = mongoose.model('Order', orderSchema);