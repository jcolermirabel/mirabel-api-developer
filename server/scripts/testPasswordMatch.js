const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

async function testPasswordMatch() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://jcoler:ACMghKUtN0K27SOx@mirabel-ai.jvpyb.mongodb.net/mirabel-api?retryWrites=true&w=majority';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');
    
    const adminEmail = 'jcoler@mirabeltechnologies.com';
    const testPassword = 'TempAdmin123!';
    
    console.log(`Testing password for ${adminEmail}...`);
    
    // Find the user
    const user = await User.findOne({ email: adminEmail });
    
    if (!user) {
      console.log('❌ User not found!');
      process.exit(1);
    }
    
    console.log('✅ User found');
    console.log(`User active: ${user.isActive}`);
    console.log(`User admin: ${user.isAdmin}`);
    console.log(`Password hash starts with: ${user.password ? user.password.substring(0, 10) + '...' : 'NO PASSWORD'}`);
    
    if (!user.password) {
      console.log('❌ User has no password set!');
      process.exit(1);
    }
    
    // Test password comparison
    console.log(`\nTesting password: "${testPassword}"`);
    const isMatch = await bcrypt.compare(testPassword, user.password);
    console.log(`Password matches: ${isMatch ? '✅ YES' : '❌ NO'}`);
    
    if (!isMatch) {
      console.log('\n🔧 Let me set the password directly without any middleware...');
      
      // Hash the password manually and set it directly
      const hashedPassword = await bcrypt.hash(testPassword, 10);
      
      // Update directly without triggering pre-save middleware
      await User.updateOne(
        { email: adminEmail },
        { 
          $set: { 
            password: hashedPassword,
            isAdmin: true,
            userType: 'admin',
            isActive: true
          }
        }
      );
      
      console.log('✅ Password updated directly');
      
      // Test again
      const updatedUser = await User.findOne({ email: adminEmail });
      const newMatch = await bcrypt.compare(testPassword, updatedUser.password);
      console.log(`New password test: ${newMatch ? '✅ SUCCESS' : '❌ STILL FAILED'}`);
      
      if (newMatch) {
        console.log('\n🎉 Password is now working!');
        console.log('🔑 Login with:');
        console.log(`📧 Email: ${adminEmail}`);
        console.log(`🔐 Password: ${testPassword}`);
      }
    } else {
      console.log('\n🎉 Password should work for login!');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testPasswordMatch(); 