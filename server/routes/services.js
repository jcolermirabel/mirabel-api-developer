const express = require('express');
const router = express.Router();
const Service = require('../models/Service');
const databaseService = require('../services/databaseService');
const { encryptDatabasePassword, decryptDatabasePassword } = require('../utils/encryption');
const { logger } = require('../utils/logger');
const DatabaseObject = require('../models/DatabaseObject');
const { authMiddleware } = require('../middleware/auth');
const { fetchDatabaseObjects, updateDatabaseObjects } = require('../utils/schemaUtils');

router.use(authMiddleware);

router.post('/', async (req, res) => {
  try {
    const encryptedPassword = encryptDatabasePassword(req.body.password);
    const service = new Service({
      ...req.body,
      password: encryptedPassword,
      createdBy: req.user.userId
    });

    await databaseService.testConnection(service);
    const savedService = await service.save();

    // Fetch schema data after service creation
    const config = {
      user: service.username,
      password: req.body.password, // Use unencrypted password
      server: service.host,
      port: service.port,
      database: service.database,
      options: {
        encrypt: true,
        trustServerCertificate: true,
      }
    };

    const dbObjects = await fetchDatabaseObjects(config);
    await updateDatabaseObjects(savedService._id, dbObjects);

    res.status(201).json(savedService);
  } catch (error) {
    logger.error('Error creating service:', error);
    res.status(500).json({ message: 'Failed to create service' });
  }
});

router.post('/test', async (req, res) => {
 try {
   const result = await databaseService.testConnection(req.body);
   res.json(result);
 } catch (error) {
   logger.error('Test connection error:', error);
   res.status(500).json({ success: false, error: error.message });
 }
});

router.post('/:id/refresh-schema', authMiddleware, async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    const decryptedPassword = decryptDatabasePassword(service.password);
    
    const config = {
      user: service.username,
      password: decryptedPassword,
      server: service.host,
      port: service.port,
      database: service.database,
      options: {
        encrypt: true,
        trustServerCertificate: true,
      }
    };

    const dbObjects = await fetchDatabaseObjects(config);
    const result = await updateDatabaseObjects(service._id, dbObjects);

    res.json({
      serviceName: service.name,
      totalObjects: result.totalObjects,
      tables: result.tables,
      views: result.views,
      procedures: result.procedures
    });
  } catch (error) {
    console.error('Schema refresh error:', error);
    res.status(500).json({ 
      message: 'Failed to refresh schema',
      error: error.message 
    });
  }
});

router.get('/:serviceId/objects', async (req, res) => {
 try {
   const service = await Service.findById(req.params.serviceId);
   if (!service) {
     return res.status(404).json({ message: 'Service not found' });
   }

   const objects = await databaseService.getDatabaseObjects(service);
   res.json(objects);
 } catch (error) {
   logger.error('Error fetching objects:', error);
   res.status(500).json({ message: 'Failed to fetch objects', error: error.message });
 }
});

router.get('/', async (req, res) => {
 try {
   const services = await Service.find();
   res.json(services);
 } catch (error) {
   logger.error('Error fetching services:', error);
   res.status(500).json({ error: 'Failed to fetch services' });
 }
});

router.put('/:id', async (req, res) => {
 try {
   const service = await Service.findByIdAndUpdate(
     req.params.id,
     { $set: req.body },
     { new: true }
   );
   if (!service) {
     return res.status(404).json({ message: 'Service not found' });
   }
   res.json(service);
 } catch (error) {
   logger.error('Error updating service:', error);
   res.status(500).json({ message: 'Error updating service' });
 }
});

router.delete('/:id', async (req, res) => {
  try {
    // Delete the service
    const service = await Service.findByIdAndDelete(req.params.id);
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    // Delete associated database objects
    await DatabaseObject.deleteOne({ serviceId: req.params.id });

    res.json({ message: 'Service and associated objects deleted successfully' });
  } catch (error) {
    logger.error('Error deleting service:', error);
    res.status(500).json({ message: 'Failed to delete service' });
  }
});

module.exports = router;