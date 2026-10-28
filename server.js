const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();


app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://digitalworldkopargaon.vercel.app'
  ],
  credentials: true
}));


app.use(express.json());
require('./config/cloudinary');
const { startWhatsApp } = require('./services/whatsappService');
// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/cart', require('./routes/cartRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/staff', require('./routes/staffRoutes'));
app.use('/api/support', require('./routes/supportRoutes'));
app.use('/api/system', require('./routes/systemRoutes'));
app.use('/api/site-settings', require('./routes/siteSettingsRoutes'));
app.use('/api/upload', require('./routes/uploadRoutes'));
app.use('/api/categories', require('./routes/categoryRoutes'));
app.use('/api/brands', require('./routes/brandRoutes'));
app.use('/api/contact', require('./routes/contactRoutes'));
app.use('/api/special-offers', require('./routes/specialOfferRoutes'));
app.use('/api/gallery', require('./routes/galleryRoutes'));
app.use('/api/reviews', require('./routes/reviewRoutes'));
// app.use('/api/reviews', require('./routes/reviewRoutes'));
app.use('/api/whatsapp', require('./routes/whatsappRoutes'));
app.use('/api/notifications', require('./routes/notifications'));


app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Digital World Backend API is running!'
  });
});

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB Connected');

    app.listen(PORT, () => {
      console.log(`🚀 Server on port ${PORT}`);

      startWhatsApp().catch(err => {
        console.error('WhatsApp startup failed:', err.message);
      });
    });
  } catch (err) {
    console.error('❌ DB Error:', err.message);
    process.exit(1);
  }
}

startServer();