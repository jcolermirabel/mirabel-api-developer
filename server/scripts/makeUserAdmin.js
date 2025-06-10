const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const User = require('../models/User');

async function makeUserAdmin() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI is not defined in the .env file');
    }
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');
    
    const adminEmail = 'jcoler@mirabeltechnologies.com';
    console.log(`Making ${adminEmail} a super admin...`);
    
    // Find or create the user
    let user = await User.findOne({ email: adminEmail });
    
    if (!user) {
      console.log('User not found, creating new admin user...');
      
      // Create new admin user with a default password
      const defaultPassword = 'TempAdmin123!'; // You can change this
      
      user = new User({
        email: adminEmail,
        password: defaultPassword, // Will be hashed by pre-save middleware
        firstName: 'Josh',
        lastName: 'Coler',
        isAdmin: true,
        userType: 'admin',
        isActive: true,
        roles: [],
        ownedServices: []
      });
      
      await user.save();
      console.log('✅ New admin user created!');
      console.log(`📧 Email: ${adminEmail}`);
      console.log(`🔑 Temporary Password: ${defaultPassword}`);
      console.log('⚠️  Please change this password after logging in!');
      
    } else {
      console.log('User found, updating admin privileges...');
      
      // Make sure user is admin and active
      user.isAdmin = true;
      user.userType = 'admin';
      user.isActive = true;
      
      await user.save();
      console.log('✅ User updated with admin privileges!');
      console.log(`📧 Email: ${adminEmail}`);
      console.log('🔑 Use your existing password to log in');
    }
    
    console.log('\n🎯 Next steps:');
    console.log('1. Start the server (npm start)');
    console.log('2. Log in with the email above');
    console.log('3. Go to settings/API keys to create a new API key');
    console.log('4. Update your .env file with the new API key');
    console.log('5. Re-enable external API authentication');
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

makeUserAdmin(); 