const express = require('express');
const Gallery = require('../models/Gallery');
const { auth, requireRole } = require('../middleware/auth');
const router = express.Router();

// PUBLIC — Get all gallery items
router.get('/', async (req, res) => {
  try {
    const items = await Gallery.find().sort('-createdAt');
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ADMIN — Get all
router.get('/admin/all', auth, requireRole('admin'), async (req, res) => {
  try {
    const items = await Gallery.find().sort('-createdAt');
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ADMIN — Add
router.post('/', auth, requireRole('admin'), async (req, res) => {
  try {
    const { mediaType, imageUrl, videoUrl, description } = req.body;

    if (!mediaType) return res.status(400).json({ message: 'Media type required' });
    if (mediaType === 'image' && !imageUrl) return res.status(400).json({ message: 'Image required' });
    if (mediaType === 'video' && !videoUrl) return res.status(400).json({ message: 'Video required' });

    const item = await Gallery.create({
      mediaType,
      imageUrl: imageUrl || '',
      videoUrl: videoUrl || '',
      description: description || '',
      createdBy: req.user.id
    });

    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ADMIN — Update
router.put('/:id', auth, requireRole('admin'), async (req, res) => {
  try {
    const { mediaType, imageUrl, videoUrl, description } = req.body;

    const item = await Gallery.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Not found' });

    if (mediaType) item.mediaType = mediaType;
    if (imageUrl !== undefined) item.imageUrl = imageUrl;
    if (videoUrl !== undefined) item.videoUrl = videoUrl;
    if (description !== undefined) item.description = description;

    await item.save();
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ADMIN — Delete
router.delete('/:id', auth, requireRole('admin'), async (req, res) => {
  try {
    await Gallery.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;