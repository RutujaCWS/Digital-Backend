const express = require('express');
const SpecialOffer = require('../models/SpecialOffer');
const { auth, requireRole } = require('../middleware/auth');
const router = express.Router();

const endOfDay = (dateInput) => {
  const d = new Date(dateInput);
  d.setHours(23, 59, 59, 999);
  return d;
};

const activeOffersQuery = () => {
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  return {
    isActive: true,
    startDate: { $lte: now },
    endDate: { $gte: startOfToday }
  };
};

const calculateDiscount = async (items, subtotal) => {
  const offers = await SpecialOffer.find(activeOffersQuery());

  let totalDiscount = 0;
  const appliedOffers = [];

  for (const offer of offers) {
    if (offer.minOrderAmount > 0 && subtotal < offer.minOrderAmount) continue;

    let applicableItems = [];
    if (offer.appliesTo === 'all') {
      applicableItems = items;
    } else if (offer.appliesTo === 'category') {
      applicableItems = items.filter(i => offer.categories.includes(i.category));
    } else if (offer.appliesTo === 'brand') {
      applicableItems = items.filter(i => offer.brands.includes(i.brand));
    } else if (offer.appliesTo === 'products') {
      const ids = offer.products.map(p => p.toString());
      applicableItems = items.filter(i =>
        ids.includes(String(i.product?._id || i.product || i.productId || ''))
      );
    }

    const excludedIds = (offer.excludedProducts || []).map(p => p.toString());
    const excludedCats = offer.excludedCategories || [];
    const excludedBrands = offer.excludedBrands || [];

    applicableItems = applicableItems.filter(i => {
      const pid = String(i.product?._id || i.product || i.productId || '');
      if (excludedIds.includes(pid)) return false;
      if (excludedCats.includes(i.category)) return false;
      if (excludedBrands.includes(i.brand)) return false;
      return true;
    });

    if (offer.minProductPrice > 0) {
      applicableItems = applicableItems.filter(
        i => Number(i.price) >= offer.minProductPrice
      );
    }

    if (applicableItems.length === 0) continue;

    const applicableTotal = applicableItems.reduce(
      (sum, i) => sum + (Number(i.price) * Number(i.quantity || 1)), 0
    );
    const totalQty = applicableItems.reduce(
      (sum, i) => sum + (Number(i.quantity) || 1), 0
    );

    let discount = 0;
    if (offer.offerType === 'flat') {
      if (offer.minOrderAmount > 0) {
        discount = offer.discountValue;
      } else {
        discount = offer.discountValue * totalQty;
      }
    } else if (offer.offerType === 'percentage') {
      discount = Math.round((applicableTotal * offer.discountValue) / 100);
      if (offer.maxDiscount > 0) discount = Math.min(discount, offer.maxDiscount);
    }

    if (discount > 0) {
      totalDiscount += discount;

      let itemBreakdown = [];
      if (offer.minOrderAmount === 0) {
        itemBreakdown = applicableItems.map(i => {
          const pid = String(i.product?._id || i.product || i.productId || '');
          const qty = Number(i.quantity) || 1;
          const perItem =
            offer.offerType === 'flat'
              ? offer.discountValue
              : Math.round((Number(i.price) * offer.discountValue) / 100);
          return {
            productId: pid,
            quantity: qty,
            discountPerItem: perItem,
            totalDiscount: perItem * qty,
            offerTitle: offer.title
          };
        });

        const rawTotal = itemBreakdown.reduce((s, b) => s + b.totalDiscount, 0);
        if (rawTotal > 0 && rawTotal !== discount) {
          const ratio = discount / rawTotal;
          itemBreakdown = itemBreakdown.map(b => ({
            ...b,
            discountPerItem: Math.floor(b.discountPerItem * ratio),
            totalDiscount: Math.floor(b.totalDiscount * ratio)
          }));
        }
      }

      appliedOffers.push({
        _id: offer._id,
        title: offer.title,
        discount,
        type: offer.offerType,
        itemBreakdown 
      });
    }
  }

  return { totalDiscount, appliedOffers };
};

// ═══════════════════════════════════════════
// PUBLIC — Active + Upcoming offers
// ═══════════════════════════════════════════
router.get('/active', async (req, res) => {
  try {
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const offers = await SpecialOffer.find({
      isActive: true,
      endDate: { $gte: startOfToday }
    }).sort({ startDate: 1 });

    const enriched = offers.map(o => ({
      ...o.toObject(),
      status: new Date(o.startDate) <= now ? 'active' : 'upcoming'
    }));

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/calculate', async (req, res) => {
  try {
    const { items, subtotal } = req.body;
    const result = await calculateDiscount(items, subtotal);
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/', auth, requireRole('admin'), async (req, res) => {
  try {
    const offers = await SpecialOffer.find().sort('-createdAt');
    res.json(offers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, requireRole('admin'), async (req, res) => {
  try {
    const data = { ...req.body, createdBy: req.user.id };
    if (!data.title || !data.startDate || !data.endDate) {
      return res.status(400).json({ message: 'Title, startDate, endDate required' });
    }
    data.endDate = endOfDay(data.endDate);
    if (new Date(data.startDate) >= new Date(data.endDate)) {
      return res.status(400).json({ message: 'End date must be after start date' });
    }
    const offer = await SpecialOffer.create(data);
    res.status(201).json(offer);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', auth, requireRole('admin'), async (req, res) => {
  try {
    const updateData = { ...req.body };
    if (updateData.endDate) {
      updateData.endDate = endOfDay(updateData.endDate);
    }
    if (updateData.startDate && updateData.endDate) {
      if (new Date(updateData.startDate) >= new Date(updateData.endDate)) {
        return res.status(400).json({ message: 'End date must be after start date' });
      }
    }
    const offer = await SpecialOffer.findByIdAndUpdate(
      req.params.id, updateData, { new: true, runValidators: true }
    );
    if (!offer) return res.status(404).json({ message: 'Not found' });
    res.json(offer);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id/toggle', auth, requireRole('admin'), async (req, res) => {
  try {
    const offer = await SpecialOffer.findById(req.params.id);
    if (!offer) return res.status(404).json({ message: 'Not found' });
    offer.isActive = !offer.isActive;
    await offer.save();
    res.json({ message: `Offer ${offer.isActive ? 'activated' : 'deactivated'}`, offer });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, requireRole('admin'), async (req, res) => {
  try {
    await SpecialOffer.findByIdAndDelete(req.params.id);
    res.json({ message: 'Offer deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
module.exports.calculateDiscount = calculateDiscount;