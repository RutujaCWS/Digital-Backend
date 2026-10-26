const mongoose = require('mongoose');

const giftSchema = new mongoose.Schema({
  name: { type: String, required: true },
  image: { type: String, default: '' },
  description: { type: String, default: '' },
  minQuantity: { type: Number, default: 1 },
  value: { type: Number, default: 0 }
}, { _id: true });

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true }, // Base Price
  dealerRate: { type: Number, default: 0,required: true  },
  originalPrice: Number,
  category: { type: String, required: true },
  brand: String,

  gst: { type: Number, default: 0, min: 0, max: 28 },
  
  condition: { 
    type: String, 
    enum: ['New', 'Second Hand'], 
    default: 'New' 
  },

  // ✅ NEW: GST included Total Price (Backend madhe save hoil)
  totalPrice: { type: Number }, 

  // 🖼️ Multiple Images
  images: { type: [String], default: [] },
  image: { type: String, default: '' },

  rating: { type: Number, default: 0 },
  numReviews: { type: Number, default: 0 },
  countInStock: { type: Number, default: 0 },

  // 🎁 Multiple Gifts
  hasGift: { type: Boolean, default: false },
  gifts: [giftSchema],

  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

// ═══════════════════════════════════════════
// Auto-set main image & Calculate Total Price
// ═══════════════════════════════════════════
productSchema.pre('save', function () {
  if (this.images && this.images.length > 0) {
    this.image = this.images[0];
  }
  
  // ✅ Backend madhe Base Price + GST = Total Price
  const gstAmount = (this.price * (this.gst || 0)) / 100;
  this.totalPrice = this.price + gstAmount;
});

// Old virtual kadhun taka (karan aata direct totalPrice save hot aahe)
// productSchema.virtual('priceWithGst')...

module.exports = mongoose.model('Product', productSchema);