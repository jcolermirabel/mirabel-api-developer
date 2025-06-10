const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const User = require('../models/User');

async function testAuth() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI is not defined in the .env file');
    }
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');
    
    // Test email - replace with the email you're trying to log in with
    const testEmail = 'jcoler@mirabeltechnologies.com'; // Change this to your login email
    const testPassword = 'your-password'; // Change this to your password
    
    console.log(`Testing authentication for: ${testEmail}`);
    
    // Find user
    const user = await User.findOne({ email: testEmail });
    
    if (!user) {
      console.log('❌ User not found in database');
      process.exit(1);
    }
    
    console.log('✅ User found in database');
    console.log(`   Active: ${user.isActive}`);
    console.log(`   Admin: ${user.isAdmin}`);
    console.log(`   Has Password: ${user.password ? 'Yes' : 'No'}`);
    
    if (!user.isActive) {
      console.log('❌ User account is inactive');
      process.exit(1);
    }
    
    // Test password comparison
    console.log('\nTesting password...');
    console.log('NOTE: Update the testPassword variable in this script with your actual password');
    
    // Uncomment the line below and add your actual password to test
    // const isMatch = await bcrypt.compare(testPassword, user.password);
    // console.log(`Password match: ${isMatch ? '✅ Yes' : '❌ No'}`);
    
    console.log('\n🔧 To test your actual password:');
    console.log('1. Edit server/scripts/testAuth.js');
    console.log('2. Set testPassword to your actual password');
    console.log('3. Uncomment the password comparison lines');
    console.log('4. Run this script again');
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testAuth(); 