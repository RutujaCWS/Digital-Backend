const express = require('express');
const Review = require('../models/Review');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const router = express.Router();

// ═══════════════════════════════════════════
// GET ALL ACTIVE REVIEWS (public)
// ═══════════════════════════════════════════
router.get('/', async (req, res) => {
  try {
    const reviews = await Review.find({ isActive: true })
      .sort({ createdAt: -1 })
      .limit(50);

    const total = reviews.length;
    const avgRating = total > 0
      ? Number((reviews.reduce((s, r) => s + r.rating, 0) / total).toFixed(1))
      : 0;

    res.json({ reviews, total, avgRating });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ═══════════════════════════════════════════
// GET MY REVIEWS (auth) — array returns
// ═══════════════════════════════════════════
router.get('/mine', auth, async (req, res) => {
  try {
    const reviews = await Review.find({ user: req.user.id })
      .sort({ createdAt: -1 });
    res.json({ reviews });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ═══════════════════════════════════════════
// CREATE REVIEW (auth)
// ═══════════════════════════════════════════
router.post('/', auth, async (req, res) => {
  try {
    const { rating, comment, city } = req.body;

    // Validation
    if (!rating || !comment) {
      return res.status(400).json({
        message: 'Rating and comment are required'
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        message: 'Rating must be between 1 and 5'
      });
    }

    if (comment.trim().length < 10) {
      return res.status(400).json({
        message: 'Comment must be at least 10 characters'
      });
    }

    // ❌ "Already reviewed" check KADHA — multiple allowed

    // Get user details
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Create review
    const review = await Review.create({
      user: user._id,
      name: user.name,
      email: user.email,
      city: city ? city.trim() : '',
      rating: Number(rating),
      comment: comment.trim()
    });

    res.status(201).json({
      message: 'Review submitted successfully',
      review
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ═══════════════════════════════════════════
// DELETE MY REVIEW (auth) — by review ID
// ═══════════════════════════════════════════
router.delete('/:id', auth, async (req, res) => {
  try {
    const review = await Review.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id  // ✅ Fakt swatahchi review delete karu shakto
    });
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }
    res.json({ message: 'Review deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;