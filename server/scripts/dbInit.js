require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const initializeDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('Connected to MongoDB for initialization');

    // Check if admin user exists
    const adminExists = await User.findOne({ email: 'jcoler@mirabeltechnologies.com' });
    
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('admin123!@#', 10);
      
      const adminUser = new User({
        email: 'jcoler@mirabeltechnologies.com',
        password: hashedPassword,
        firstName: 'Jestin',
        lastName: 'Coler',
        isAdmin: true
      });

      await adminUser.save();
      console.log('Admin user created successfully');
    } else {
      console.log('Admin user already exists');
    }

    // Check existing indexes
    const existingIndexes = await User.collection.indexes();
    const hasEmailIndex = existingIndexes.some(index => index.name === 'email_1');
    const hasApiKeyIndex = existingIndexes.some(index => index.name === 'apiKey_1');

    // Create indexes only if they don't exist
    if (!hasEmailIndex) {
      await User.collection.createIndex({ email: 1 }, { unique: true });
      console.log('Email index created');
    }

    if (!hasApiKeyIndex) {
      await User.collection.createIndex({ apiKey: 1 }, { unique: true, sparse: true });
      console.log('API key index created');
    }

    console.log('Database initialization completed');
    process.exit(0);
  } catch (error) {
    console.error('Database initialization failed:', error.message);
    process.exit(1);
  }
};

initializeDatabase(); 