const mongoose = require('mongoose');
const Product = require('./models/Product');
require('dotenv').config();

const products = [
  { name: 'iPhone 15 Pro', description: 'Latest Apple flagship smartphone with A17 Pro chip', price: 129999, originalPrice: 149999, category: 'Mobiles', brand: 'Apple', image: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=400', rating: 4.5, numReviews: 120, countInStock: 10, hasGift: true, gifts: [{ name: 'Free AirPods', value: 1999, minQuantity: 1 }] },
  { name: 'Samsung Galaxy S24', description: 'Powerful Android flagship with AI features', price: 79999, originalPrice: 89999, category: 'Mobiles', brand: 'Samsung', image: 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=400', rating: 4.3, numReviews: 90, countInStock: 15, hasGift: true, gifts: [{ name: 'Free Phone Cover', value: 499, minQuantity: 1 }] },
  { name: 'Sony WH-1000XM5', description: 'Industry-leading noise cancelling headphones', price: 29999, originalPrice: 34999, category: 'Electronics', brand: 'Sony', image: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=400', rating: 4.7, numReviews: 200, countInStock: 20, hasGift: true, gifts: [{ name: 'Free Carry Case', value: 999, minQuantity: 1 }] },
  { name: 'Nike Air Max', description: 'Comfortable running shoes for daily use', price: 8999, originalPrice: 12999, category: 'Fashion', brand: 'Nike', image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400', rating: 4.2, numReviews: 60, countInStock: 30 },
  { name: 'MacBook Air M3', description: 'Thin and light laptop with M3 chip', price: 114999, originalPrice: 129999, category: 'Electronics', brand: 'Apple', image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400', rating: 4.8, numReviews: 150, countInStock: 8, hasGift: true, gifts: [{ name: 'Free Sleeve', value: 1499, minQuantity: 1 }] },
  { name: "Levi's Jeans", description: 'Classic blue denim jeans', price: 2499, originalPrice: 3999, category: 'Fashion', brand: "Levi's", image: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400', rating: 4.1, numReviews: 45, countInStock: 50 },
  { name: 'Boat Airdopes', description: 'True wireless earbuds with 40h playback', price: 1499, originalPrice: 2999, category: 'Electronics', brand: 'Boat', image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400', rating: 4.0, numReviews: 300, countInStock: 100 },
  { name: 'Prestige Cooker', description: 'Stainless steel pressure cooker 5L', price: 1899, originalPrice: 2499, category: 'Home', brand: 'Prestige', image: 'https://images.unsplash.com/photo-1585515320310-259814833e62?w=400', rating: 4.4, numReviews: 80, countInStock: 25 },
  { name: 'LG Smart TV 55"', description: '4K Ultra HD Smart LED TV', price: 45999, originalPrice: 59999, category: 'Electronics', brand: 'LG', image: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=400', rating: 4.5, numReviews: 210, countInStock: 12 },
  { name: 'Puma T-Shirt', description: 'Cotton crew neck t-shirt', price: 799, originalPrice: 1299, category: 'Fashion', brand: 'Puma', image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400', rating: 4.0, numReviews: 55, countInStock: 100 }
];

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  await Product.deleteMany();
  await Product.insertMany(products);
  console.log('✅ Seeded ' + products.length + ' products');
  process.exit();
})();