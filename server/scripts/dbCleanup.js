require('dotenv').config();
const mongoose = require('mongoose');
const { logger } = require('../config/winston');
const User = require('../models/User');
const Service = require('../models/Service');
const Role = require('../models/Role');

const cleanupDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    logger.info('Connected to MongoDB for cleanup');

    // Keep admin user but remove all other data
    const adminUser = await User.findOne({ email: 'admin@mirabel.api' });
    
    await User.deleteMany({ _id: { $ne: adminUser._id } });
    await Service.deleteMany({});
    await Role.deleteMany({});

    logger.info('Database cleanup completed');
    process.exit(0);
  } catch (error) {
    logger.error('Database cleanup failed:', error);
    process.exit(1);
  }
};

cleanupDatabase(); 