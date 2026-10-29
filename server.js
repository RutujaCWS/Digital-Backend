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
// const { startWhatsApp } = require('./services/whatsappService');


const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return;
  }

  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is missing');
  }

  await mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 15000,
    connectTimeoutMS: 15000,
  });
};

// Connect to MongoDB before API routes
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    console.error('MongoDB connection error:', error.message);

    res.status(503).json({
      success: false,
      message: 'Database temporarily unavailable',
    });
  }
});


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
// app.use('/api/whatsapp', require('./routes/whatsappRoutes'));
app.use('/api/notifications', require('./routes/notifications'));


app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Digital World Backend API is running!'
  });
});

// mongoose.connect(process.env.MONGO_URI)
//   .then(() => console.log('✅ MongoDB Connected'))
//   .catch(err => console.log('❌ DB Error:', err));

// const PORT = process.env.PORT || 5000;

// app.listen(PORT, () => {
//   console.log(`🚀 Server on port ${PORT}`);

//   // startWhatsApp().catch(err => {
//   //   console.error('WhatsApp startup failed:', err.message);
//   // });
// });



const PORT = process.env.PORT || 5000;

if (process.env.VERCEL) {
  module.exports = app;
} else {
  connectDB()
    .then(() => {
      console.log('✅ MongoDB Connected');

      app.listen(PORT, () => {
        console.log(`🚀 Server on port ${PORT}`);
      });
    })
    .catch((error) => {
      console.error('❌ DB Error:', error.message);
    });
}
