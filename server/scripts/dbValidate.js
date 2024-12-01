require('dotenv').config();
const mongoose = require('mongoose');
const { logger } = require('../config/winston');
const User = require('../models/User');
const Service = require('../models/Service');
const Role = require('../models/Role');

const validateDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    logger.info('Connected to MongoDB for validation');

    // Validate collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    const collectionNames = collections.map(col => col.name);

    logger.info('Existing collections:', collectionNames);

    // Validate indexes
    const userIndexes = await User.collection.indexes();
    const serviceIndexes = await Service.collection.indexes();
    const roleIndexes = await Role.collection.indexes();

    logger.info('User indexes:', userIndexes);
    logger.info('Service indexes:', serviceIndexes);
    logger.info('Role indexes:', roleIndexes);

    // Validate admin user
    const adminUser = await User.findOne({ email: 'admin@mirabel.api' });
    if (!adminUser) {
      logger.error('Admin user not found');
    } else {
      logger.info('Admin user exists');
    }

    logger.info('Database validation completed');
    process.exit(0);
  } catch (error) {
    logger.error('Database validation failed:', error);
    process.exit(1);
  }
};

validateDatabase(); 