require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const resetPassword = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    const hashedPassword = await bcrypt.hash('ENTER PASSWORD HERE', 10);
    
    const result = await User.updateOne(
      { email: 'jcoler@mirabeltechnologies.com' },
      { $set: { password: hashedPassword } }
    );

    console.log('Password reset result:', result);
    process.exit(0);
  } catch (error) {
    console.error('Password reset failed:', error);
    process.exit(1);
  }
};

resetPassword(); 