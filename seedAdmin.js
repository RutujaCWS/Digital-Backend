const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
require('dotenv').config();

(async () => {
  await mongoose.connect(process.env.MONGO_URI);

  const seedStaff = [
    { name: 'Super Admin', email: 'admin@flipkart.com', password: 'admin123', role: 'admin', department: 'Management', employeeId: 'AD-0001' },
    { name: 'Priya Patil', email: 'backoffice@flipkart.com', password: 'back123', role: 'backoffice', department: 'Back Office', employeeId: 'BO-0002' },
    { name: 'Amit Shinde', email: 'network@flipkart.com', password: 'net123', role: 'network', department: 'Network', employeeId: 'NE-0003' }
  ];

  for (const s of seedStaff) {
    await User.deleteOne({ email: s.email });
    const hashed = await bcrypt.hash(s.password, 10);
    await User.create({ ...s, password: hashed, isActive: true });
    console.log(`✅ ${s.role.padEnd(12)} → ${s.email} / ${s.password}`);
  }

  console.log('\n🎉 Staff accounts created!');
  process.exit();
})();