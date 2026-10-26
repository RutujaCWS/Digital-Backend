const express = require('express');
const cloudinary = require('../config/cloudinary');
const { uploadImage, uploadVideo } = require('../middleware/upload');
const { auth, requireRole } = require('../middleware/auth');
const router = express.Router();

// ═══════════════════════════════════════════
// IMAGE upload
// ═══════════════════════════════════════════
router.post(
  '/image',
  auth,
  requireRole('admin', 'backoffice'),
  uploadImage.single('image'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }
      res.json({
        message: 'Image uploaded successfully',
        url: req.file.path,
        publicId: req.file.filename,
        mediaType: 'image'
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// ═══════════════════════════════════════════
// 🎥 VIDEO upload
// ═══════════════════════════════════════════
router.post(
  '/video',
  auth,
  requireRole('admin'),
  uploadVideo.single('video'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }
      res.json({
        message: 'Video uploaded successfully',
        url: req.file.path,
        publicId: req.file.filename,
        mediaType: 'video'
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// ═══════════════════════════════════════════
// Delete media (image or video)
// ═══════════════════════════════════════════
router.delete(
  '/media/:publicId',
  auth,
  requireRole('admin'),
  async (req, res) => {
    try {
      const publicId = req.params.publicId;
      // Try image first, then video
      try {
        await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
      } catch {
        await cloudinary.uploader.destroy(publicId, { resource_type: 'video' });
      }
      res.json({ message: 'Media deleted' });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// ═══════════════════════════════════════════
// Delete image (backward-compatible route)
// ═══════════════════════════════════════════
router.delete(
  '/image/:publicId',
  auth,
  requireRole('admin'),
  async (req, res) => {
    try {
      await cloudinary.uploader.destroy(req.params.publicId);
      res.json({ message: 'Image deleted' });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

module.exports = router;