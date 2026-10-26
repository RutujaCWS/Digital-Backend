const express = require('express');
const Product = require('../models/Product');
const { auth, requireRole } = require('../middleware/auth');
const audit = require('../middleware/audit');
const router = express.Router();

// PUBLIC — list
router.get('/', async (req, res) => {
  const { category, search } = req.query;
  const filter = { isActive: true };
  if (category) filter.category = category;
  if (search) filter.name = { $regex: search, $options: 'i' };
  const products = await Product.find(filter).sort('-createdAt');
  res.json(products);
});

// PUBLIC — single
router.get('/:id', async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ message: 'Not found' });
  res.json(product);
});

// Back Office + Admin
router.post('/', auth, requireRole('backoffice', 'admin'),
  audit('PRODUCT_CREATE', 'Product'), async (req, res) => {
    const product = await Product.create({ ...req.body, addedBy: req.user.id });
    res.status(201).json(product);
  });

  router.put('/:id', auth, requireRole('backoffice', 'admin'),
  audit('PRODUCT_UPDATE', 'Product'), async (req, res) => {
    try {
      const data = req.body;
      
      // Update karnyasathi manually Total Price calculate kara
      if (data.price !== undefined || data.gst !== undefined) {
        const basePrice = Number(data.price);
        const gstRate = Number(data.gst) || 0;
        data.totalPrice = basePrice + (basePrice * gstRate) / 100;
      }

      const product = await Product.findByIdAndUpdate(req.params.id, data, { new: true });
      res.json(product);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
});

// Only Admin
router.delete('/:id', auth, requireRole('admin'),
  audit('PRODUCT_DELETE', 'Product'), async (req, res) => {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  });

module.exports = router;