const express = require('express');
const mongoose = require('mongoose'); 
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const { auth, requireRole } = require('../middleware/auth');
const SiteSettings = require('../models/SiteSettings');
const Notification = require('../models/Notification');
const User = require('../models/User');    
const audit = require('../middleware/audit');
const { sendWhatsAppMessage } = require('../services/whatsappService');
const { calculateDiscount } = require('./specialOfferRoutes');
const router = express.Router();

router.post('/', auth, async (req, res) => {
  try {
    const { shippingAddress, paymentMethod = 'COD' } = req.body;
    const required = ['fullName', 'phone', 'address', 'city', 'state', 'pincode'];
    for (const f of required) {
      if (!shippingAddress?.[f]) return res.status(400).json({ message: `${f} required` });
    }

    const cart = await Cart.findOne({ user: req.user.id }).populate('items.product');
    if (!cart || cart.items.length === 0) return res.status(400).json({ message: 'Cart empty' });

    const items = [];
    for (const i of cart.items) {
      if (!i.product) continue;
      if (i.product.countInStock < i.quantity) {
        return res.status(400).json({ message: `${i.product.name} out of stock` });
      }
      items.push({
        product: i.product._id, name: i.product.name,
        price: i.product.price, quantity: i.quantity, image: i.product.image,
        gst: i.product.gst, // ✅ GST items madhe save kela
        dealerRate: i.product.dealerRate || 0, // ✅ NEW
        gifts: i.product.hasGift && i.quantity >= (i.product.gifts?.[0]?.minQuantity || 1)
          ? i.product.gifts.map(g => ({ name: g.name, value: g.value })) : []
      });
    }

    // ✅ Base Price ani Total GST vegle kadhle
    const itemsPrice = items.reduce((s, i) => s + i.price * i.quantity, 0);
    
    const totalGst = items.reduce((s, i) => {
      const gstRate = Number(i.gst) || 0;
      return s + (i.price * i.quantity * gstRate) / 100;
    }, 0);

    const finalItemsPrice = itemsPrice + totalGst; // Base + GST

    const deliveryCharge = finalItemsPrice > 500 ? 0 : 40;

    const cartItemsForCalc = cart.items
      .filter(i => i.product)
      .map(i => ({
        product: i.product._id,
        productId: i.product._id,
        price: Number(i.product.price) || 0,
        quantity: Number(i.quantity) || 1,
        category: i.product.category,
        brand: i.product.brand
      }));

    const { totalDiscount, appliedOffers } = await calculateDiscount(
      cartItemsForCalc,
      finalItemsPrice
    );

    const mappedAppliedOffers = (appliedOffers || []).map(o => ({
      offerId: o._id,
      title: o.title || 'Special Offer',
      discount: Number(o.discount) || 0,
      type: o.type || 'flat'
    }));

    // ✅ Final Total Price (Base + GST + Delivery - Discount)
    const totalPrice = finalItemsPrice + deliveryCharge - totalDiscount;

    const order = await Order.create({
      user: req.user.id, items, shippingAddress, paymentMethod,
      itemsPrice: finalItemsPrice, 
      deliveryCharge,
      discount: totalDiscount,
      appliedOffers: mappedAppliedOffers,
      totalPrice, 
      isPaid: false, 
      paidAt: undefined,
      statusHistory: [{ status: 'Pending', changedBy: req.user.id, changedByName: req.user.name }]
    });

    for (const i of cart.items) {
      await Product.findByIdAndUpdate(i.product._id, { $inc: { countInStock: -i.quantity } });
    }
    cart.items = [];
    await cart.save();

    try {
      const admins = await User.find({
        role: { $in: ['admin', 'backoffice'] },
        isActive: true
      }).select('_id name role');
    
      console.log('Notification recipients found:', admins.length);
    
      if (admins.length === 0) {
        console.log('⚠️ No active admin/backoffice users found');
      }
    
      for (const admin of admins) {
        const notification = await Notification.create({
          user: admin._id,
          type: 'Order',
          message: `New Order #${order.orderNumber} placed by ${
            req.user.name || 'Customer'
          } — Total ₹${Number(order.totalPrice).toLocaleString('en-IN')}`,
          link: admin.role === 'backoffice'
            ? '/backoffice/orders'
            : '/admin/orders'
        });
    
        console.log(
          `✅ Notification created for ${admin.role}: ${notification._id}`
        );
      }
    } catch (err) {
      console.error('❌ Notification creation failed:', err);
    }


    const settings = await SiteSettings.findOne().select('companyName');
    const shopName = settings?.companyName || 'Our Store';

    const waMessage =
      `Hello *${order.shippingAddress.fullName}*,\n\n` +
      `Your order has reached *${shopName}*. We will connect with you shortly to confirm the order.\n\n` +
      `*Order Details:*\n` +
      `Order No: *${order.orderNumber}*\n` +
      `Total: *₹${order.totalPrice}*\n` +
      `Payment: ${order.paymentMethod}\n` +
      `Status: ${order.status}\n\n` +
      `Thank you for shopping with *${shopName}*! 🙏`;

    sendWhatsAppMessage(order.shippingAddress.phone, waMessage)
      .then(sent => {
        if (sent) console.log(`✅ WhatsApp sent to ${order.shippingAddress.phone} for order ${order.orderNumber}`);
        else console.log(`⚠️ WhatsApp NOT sent for order ${order.orderNumber}`);
      })
      .catch(err => console.error(`❌ WhatsApp failed for order ${order.orderNumber}:`, err.message));

    res.status(201).json(order);

  } catch (err) { 
    console.error("ORDER CREATE ERROR:", err); 
    res.status(500).json({ message: err.message }); 
  }
});

// USER — my orders
router.get('/myorders', auth, async (req, res) => {
  const orders = await Order.find({ user: req.user.id }).sort('-createdAt');
  res.json(orders);
});

// Single order
router.get('/:id', auth, async (req, res) => {
  const order = await Order.findById(req.params.id).populate('user', 'name email');
  if (!order) return res.status(404).json({ message: 'Not found' });
  if (order.user._id.toString() !== req.user.id && !['admin', 'backoffice'].includes(req.user.role)) {
    return res.status(403).json({ message: 'Not authorized' });
  }
  res.json(order);
});

// Cancel
router.put('/:id/cancel', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Not found' });
    if (order.user.toString() !== req.user.id) return res.status(403).json({ message: 'Not yours' });
    
    if (order.status === 'Cancelled') {
      return res.status(400).json({ message: 'Order already cancelled' });
    }
    if (order.status !== 'Pending') {
      return res.status(400).json({ message: 'Only pending orders can be cancelled' });
    }

    order.status = 'Cancelled';
    order.statusHistory.push({ status: 'Cancelled', changedBy: req.user.id, changedByName: req.user.name });
    await order.save();

    for (const i of order.items) {
      await Product.findByIdAndUpdate(i.product, { $inc: { countInStock: i.quantity } });
    }

    const settings = await SiteSettings.findOne().select('companyName');
    const shopName = settings?.companyName || 'Our Store';

    const waMessage =
      `Hello *${order.shippingAddress.fullName}*,\n\n` +
      `Your order *${order.orderNumber}* has been cancelled.\n\n` +
      `Contact us if you need help: *${shopName}*\n\n` +
      `Thank you!`;

    sendWhatsAppMessage(order.shippingAddress.phone, waMessage).catch(err => console.error(err.message));
    res.json(order);
  } catch (err) {
    if (!res.headersSent) res.status(500).json({ message: err.message });
  }
});

// STAFF — all orders
router.get('/', auth, requireRole('backoffice', 'admin'), async (req, res) => {
  const { status } = req.query;
  const filter = status ? { status } : {};
  const orders = await Order.find(filter)
    .populate('user', 'name email phone')
    .sort('-createdAt');
  res.json(orders);
});

// STAFF — update status
router.put('/:id/status', auth, requireRole('backoffice', 'admin'),
  audit('ORDER_STATUS_UPDATE', 'Order'), async (req, res) => {
    const { status, note } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Not found' });

    order.status = status;
    order.statusHistory.push({
      status, note, changedBy: req.user.id, changedByName: req.user.name
    });
    if (status === 'Delivered') order.deliveredAt = new Date();
    await order.save();

    // Customer notification
    try {
      await Notification.create({
        user: order.user,
        type: 'Order Status',
        message: `Your order #${order.orderNumber} status has been changed to ${status}.`,
        link: '/orders'
      });

      console.log('✅ Customer order status notification created');
    } catch (err) {
      console.error('❌ Customer notification failed:', err);
    }

    const settings = await SiteSettings.findOne().select('companyName');
    const shopName = settings?.companyName || 'Our Store';

    const waMessage =
      `Hello *${order.shippingAddress.fullName}*,\n\n` +
      `Your order *${order.orderNumber}* has been *${status}*.\n\n` +
      `Thank you for shopping with *${shopName}*!`;

    sendWhatsAppMessage(order.shippingAddress.phone, waMessage).catch(err => console.error(err.message));
    res.json(order);
});

// STAFF — update payment status (Paid / Unpaid)
router.put('/:id/payment', auth, requireRole('backoffice', 'admin'), async (req, res) => {
  try {
    const { isPaid } = req.body;
    const order = await Order.findById(req.params.id);
    
    if (!order) return res.status(404).json({ message: 'Order not found' });

    order.isPaid = isPaid;
    order.paidAt = isPaid ? new Date() : undefined;
    await order.save();

    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ADMIN — stats
router.get('/admin/stats', auth, requireRole('admin'), async (req, res) => {
  const [totalOrders, pending, delivered, revenueAgg] = await Promise.all([
    Order.countDocuments(),
    Order.countDocuments({ status: 'Pending' }),
    Order.countDocuments({ status: 'Delivered' }),
    Order.aggregate([
      { $match: { status: 'Delivered', isPaid: true } },
      { $group: { _id: null, total: { $sum: '$totalPrice' } } }
    ])
  ]);
  res.json({
    totalOrders, pending, delivered,
    revenue: revenueAgg[0]?.total || 0
  });
});


// ADMIN — Monthly Profit & Revenue Report
router.get('/admin/reports', auth, requireRole('admin'), async (req, res) => {
  try {
    // Fakt Delivered orders ghe (Revenue sathi)
    const orders = await Order.find({ status: 'Delivered', isPaid: true }).sort('-createdAt');

    // Mahinyanusa data vegla kara (Grouping by Month & Year)
    const reportData = {};

    orders.forEach(order => {
      const date = new Date(order.createdAt);
      const monthYear = date.toLocaleString('default', { month: 'short', year: 'numeric' }); // Udaharan: "Oct 2026"

      if (!reportData[monthYear]) {
        reportData[monthYear] = {
          month: monthYear,
          totalRevenue: 0,      // Ekhada Customer kadun aalela paisa
          totalDealerCost: 0,   // Dealer la dilela paisa
          totalProfit: 0,       // Nafa (Revenue - Dealer Cost)
          totalOrders: 0,
        };
      }

      // 1. Revenue (GST included total)
      reportData[monthYear].totalRevenue += Number(order.totalPrice) || 0;
      reportData[monthYear].totalOrders += 1;

      // 2. Dealer Cost (Items madhun calculate)
      order.items.forEach(item => {
        // Product madhe dealerRate nasel tar 0 ghe
        const dealerRate = Number(item.dealerRate) || 0; 
        const qty = Number(item.quantity) || 1;
        reportData[monthYear].totalDealerCost += (dealerRate * qty);
      });
    });

    // Array madhe convert kara ani Profit calculate kara
    const finalReport = Object.values(reportData).map(row => {
      row.totalProfit = row.totalRevenue - row.totalDealerCost;
      return row;
    });

    // Mahinyanusa sort kara (Latest aadhi)
    finalReport.sort((a, b) => new Date(b.month) - new Date(a.month));

    res.json(finalReport);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


module.exports = router;