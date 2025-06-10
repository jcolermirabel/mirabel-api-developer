const mongoose = require('mongoose');
const User = require('../models/User');

async function checkUsers() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://jcoler:ACMghKUtN0K27SOx@mirabel-ai.jvpyb.mongodb.net/mirabel-api?retryWrites=true&w=majority';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');
    
    // Get all users
    const users = await User.find({});
    console.log(`Found ${users.length} users in database:`);
    
    if (users.length === 0) {
      console.log('No users found! This is why login is failing.');
      console.log('You need to register a user first.');
    } else {
      users.forEach((user, index) => {
        console.log(`${index + 1}. Email: ${user.email}`);
        console.log(`   Active: ${user.isActive}`);
        console.log(`   Admin: ${user.isAdmin}`);
        console.log(`   Has Password: ${user.password ? 'Yes' : 'No'}`);
        console.log('');
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkUsers(); 