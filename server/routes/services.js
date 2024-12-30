const express = require('express');
const router = express.Router();
const Service = require('../models/Service');
const databaseService = require('../services/databaseService');
const { encryptDatabasePassword } = require('../utils/encryption');
const { logger } = require('../utils/logger');
const DatabaseObject = require('../models/DatabaseObject');
const { authMiddleware } = require('../middleware/auth');

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
   await service.save();
   res.status(201).json(service);
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

router.post('/:id/refresh-schema', async (req, res) => {
 try {
   const service = await Service.findById(req.params.id);
   if (!service) {
     return res.status(404).json({ message: 'Service not found' });
   }

   const objects = await databaseService.getDatabaseObjects(service);
   res.json({ 
     message: 'Schema refreshed successfully',
     service: service.name,
     objectCount: {
       tables: objects.filter(o => o.object_category === 'TABLE').length,
       views: objects.filter(o => o.object_category === 'VIEW').length,
       procedures: objects.filter(o => o.object_category === 'PROCEDURE').length,
       total: objects.length
     }
   });
 } catch (error) {
   logger.error('Error refreshing schema:', error);
   res.status(500).json({ message: 'Failed to refresh schema' });
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
    const service = await Service.findByIdAndDelete(req.params.id);
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }
    res.json({ message: 'Service deleted successfully' });
  } catch (error) {
    logger.error('Error deleting service:', error);
    res.status(500).json({ message: 'Failed to delete service' });
  }
});

module.exports = router;