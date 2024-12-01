const mongoose = require('mongoose');
const Role = require('../models/Role');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const createTestRole = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const testRole = new Role({
      name: 'Test Role',
      description: 'A test role for verification',
      databaseObject: 'users',
      service: '67415552a04a0b4fcfe813d8',
      createdBy: '6741517be060d76e29fec53e',
      permissions: {
        canViewDashboard: true,
        canManageUsers: false,
        canManageRoles: false,
        canManageServices: false,
        canViewDocs: true
      }
    });

    await testRole.save();
    console.log('Test role created successfully:', testRole);
    
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error creating test role:', error);
  } finally {
    process.exit();
  }
};

createTestRole(); 