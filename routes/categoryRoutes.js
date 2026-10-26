const express = require('express');
const Category = require('../models/Category');
const { auth, requireRole } = require('../middleware/auth');
const router = express.Router();

// ═══════════════════════════════════════════
// PUBLIC — Get all active categories
// ═══════════════════════════════════════════
router.get('/', async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true }).sort('order');
    res.json(categories);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ═══════════════════════════════════════════
// ADMIN — Get all categories (including inactive)
// ═══════════════════════════════════════════
router.get('/admin/all', auth, requireRole('admin'), async (req, res) => {
  try {
    const categories = await Category.find().sort('order');
    res.json(categories);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ═══════════════════════════════════════════
// ADMIN — Add category
// ═══════════════════════════════════════════
router.post('/', auth, requireRole('admin'), async (req, res) => {
  try {
    const { name, icon, color, image, description, order } = req.body;

    if (!name) return res.status(400).json({ message: 'Name required' });

    const exists = await Category.findOne({ name: name.trim() });
    if (exists) return res.status(400).json({ message: 'Category already exists' });

    const category = await Category.create({
      name: name.trim(),
      icon: icon || '📦',
      color: color || '#e3f2fd',
      image: image || '',
      description: description || '',
      order: order || 0,
      createdBy: req.user.id
    });

    res.status(201).json(category);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ═══════════════════════════════════════════
// ADMIN — Update category
// ═══════════════════════════════════════════
router.put('/:id', auth, requireRole('admin'), async (req, res) => {
  try {
    const category = await Category.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!category) return res.status(404).json({ message: 'Not found' });
    res.json(category);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ═══════════════════════════════════════════
// ADMIN — Delete category
// ═══════════════════════════════════════════
router.delete('/:id', auth, requireRole('admin'), async (req, res) => {
  try {
    await Category.findByIdAndDelete(req.params.id);
    res.json({ message: 'Category deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ═══════════════════════════════════════════
// ADMIN — Reorder categories
// ═══════════════════════════════════════════
router.post('/reorder', auth, requireRole('admin'), async (req, res) => {
  try {
    const { orderedIds } = req.body;   // Array of category _ids
    if (!Array.isArray(orderedIds)) {
      return res.status(400).json({ message: 'orderedIds must be an array' });
    }

    await Promise.all(
      orderedIds.map((id, index) =>
        Category.findByIdAndUpdate(id, { order: index })
      )
    );

    const categories = await Category.find().sort('order');
    res.json(categories);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;