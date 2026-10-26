const express = require('express');
const SiteSettings = require('../models/SiteSettings');
const { auth, requireRole } = require('../middleware/auth');
const router = express.Router();

// PUBLIC — Get settings
router.get('/', async (req, res) => {
  try {
    let settings = await SiteSettings.findOne();
    if (!settings) settings = await SiteSettings.create({});
    res.json(settings);
  } catch (err) {
    console.error('GET site-settings error:', err);
    res.status(500).json({ message: err.message });
  }
});

// ADMIN — Update settings
router.put('/', auth, requireRole('admin'), async (req, res) => {
  try {
    let settings = await SiteSettings.findOne();
    if (!settings) settings = new SiteSettings();

    const updates = req.body;

    // Company
    if (updates.companyName !== undefined) settings.companyName = updates.companyName;
    if (updates.tagline !== undefined) settings.tagline = updates.tagline;
    if (updates.description !== undefined) settings.description = updates.description;
    if (updates.logoUrl !== undefined) settings.logoUrl = updates.logoUrl;

    // About
    if (updates.aboutStory !== undefined) settings.aboutStory = updates.aboutStory;
    if (updates.mission !== undefined) settings.mission = updates.mission;
    if (updates.vision !== undefined) settings.vision = updates.vision;
    if (updates.values !== undefined) settings.values = updates.values;
    if (updates.establishedYear !== undefined) settings.establishedYear = updates.establishedYear;

    // Hero Sliders
    if (updates.heroSlides !== undefined) settings.heroSlides = updates.heroSlides;

    // 🆕 Features
    if (updates.features !== undefined) settings.features = updates.features;

    // Contact
    if (updates.address !== undefined) settings.address = updates.address;
    if (updates.phone1 !== undefined) settings.phone1 = updates.phone1;
    if (updates.phone2 !== undefined) settings.phone2 = updates.phone2;
    if (updates.email1 !== undefined) settings.email1 = updates.email1;
    if (updates.email2 !== undefined) settings.email2 = updates.email2;
    if (updates.whatsapp !== undefined) settings.whatsapp = updates.whatsapp;
    if (updates.workingHours !== undefined) settings.workingHours = updates.workingHours;
    if (updates.gstNumber !== undefined) settings.gstNumber = updates.gstNumber;
    if (updates.googleMapUrl !== undefined) settings.googleMapUrl = updates.googleMapUrl;

    // Social
    if (updates.facebook !== undefined) settings.facebook = updates.facebook;
    if (updates.instagram !== undefined) settings.instagram = updates.instagram;
    if (updates.twitter !== undefined) settings.twitter = updates.twitter;
    if (updates.youtube !== undefined) settings.youtube = updates.youtube;
    if (updates.linkedin !== undefined) settings.linkedin = updates.linkedin;
    if (updates.footerText !== undefined) settings.footerText = updates.footerText;

    settings.updatedBy = req.user.id;
    await settings.save();

    res.json({ message: 'Settings updated', settings });
  } catch (err) {
    console.error('PUT site-settings error:', err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;