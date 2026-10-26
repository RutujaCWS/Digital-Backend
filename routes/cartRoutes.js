const express = require('express');
const Cart = require('../models/Cart');
const { auth } = require('../middleware/auth');
const router = express.Router();

router.get('/', auth, async (req, res) => {
  let cart = await Cart.findOne({ user: req.user.id }).populate('items.product');
  if (!cart) cart = await Cart.create({ user: req.user.id, items: [] });
  res.json(cart);
});

router.post('/add', auth, async (req, res) => {
  const { productId, quantity = 1 } = req.body;
  let cart = await Cart.findOne({ user: req.user.id });
  if (!cart) cart = new Cart({ user: req.user.id, items: [] });

  const idx = cart.items.findIndex(i => i.product.toString() === productId);
  if (idx > -1) cart.items[idx].quantity += quantity;
  else cart.items.push({ product: productId, quantity });

  await cart.save();
  cart = await Cart.findById(cart._id).populate('items.product');
  res.json(cart);
});

router.delete('/remove/:productId', auth, async (req, res) => {
  const cart = await Cart.findOne({ user: req.user.id });
  cart.items = cart.items.filter(i => i.product.toString() !== req.params.productId);
  await cart.save();
  res.json(cart);
});

router.put('/update', auth, async (req, res) => {
  const { productId, quantity } = req.body;
  const cart = await Cart.findOne({ user: req.user.id });
  const item = cart.items.find(i => i.product.toString() === productId);
  if (item) item.quantity = quantity;
  await cart.save();
  res.json(cart);
});

module.exports = router;