const express = require('express');
const Brand = require('../models/Brand');
const { auth, requireRole } = require('../middleware/auth');
const router = express.Router();

// PUBLIC — Get all ACTIVE brands (for homepage)
router.get('/', async (req, res) => {
  try {
    const brands = await Brand.find({ isActive: true }).sort('name');
    res.json(brands);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ADMIN — Get ALL brands (including inactive)
router.get('/admin/all', auth, requireRole('admin'), async (req, res) => {
  try {
    const brands = await Brand.find().sort('name');
    res.json(brands);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ADMIN — Add brand
router.post('/', auth, requireRole('admin'), async (req, res) => {
  try {
    const { name, logo } = req.body;

    if (!name) return res.status(400).json({ message: 'Name required' });

    const exists = await Brand.findOne({ name: name.trim() });
    if (exists) return res.status(400).json({ message: 'Brand already exists' });

    const brand = await Brand.create({
      name: name.trim(),
      logo: logo || '',
      isActive: true,
      createdBy: req.user.id
    });

    res.status(201).json(brand);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ADMIN — Update brand (name, logo, isActive)
router.put('/:id', auth, requireRole('admin'), async (req, res) => {
  try {
    const { name, logo, isActive } = req.body;

    const brand = await Brand.findById(req.params.id);
    if (!brand) return res.status(404).json({ message: 'Not found' });

    if (name) brand.name = name.trim();
    if (logo !== undefined) brand.logo = logo;
    if (typeof isActive === 'boolean') brand.isActive = isActive;

    await brand.save();
    res.json(brand);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ADMIN — Delete brand
router.delete('/:id', auth, requireRole('admin'), async (req, res) => {
  try {
    await Brand.findByIdAndDelete(req.params.id);
    res.json({ message: 'Brand deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;