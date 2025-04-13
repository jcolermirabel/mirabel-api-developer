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
    console.log('Service creation request received:', {
      name: req.body.name,
      host: req.body.host,
      port: req.body.port,
      database: req.body.database,
      username: req.body.username,
      passwordLength: req.body.password ? req.body.password.length : 0,
      hasPasswordColon: req.body.password ? req.body.password.includes(':') : false
    });

    // Test connection first with unencrypted password
    console.log('Testing connection with unencrypted password');
    const connectionResult = await databaseService.testConnection({
      ...req.body
    });
    
    console.log('Connection test result:', connectionResult);
    
    if (!connectionResult.success) {
      return res.status(400).json({ 
        message: 'Connection test failed', 
        error: connectionResult.error 
      });
    }

    // Only encrypt password after successful connection test
    console.log('Connection test successful, encrypting password');
    try {
      const encryptedPassword = encryptDatabasePassword(req.body.password);
      console.log('Password encryption successful, encrypted length:', encryptedPassword.length);
      
      const service = new Service({
        ...req.body,
        password: encryptedPassword,
        createdBy: req.user.userId
      });

      console.log('Saving service to database');
      const savedService = await service.save();
      console.log('Service saved successfully with ID:', savedService._id);

      // Fetch schema data after service creation in a separate try/catch
      try {
        console.log('Fetching database objects');
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
        console.log('Database objects fetched successfully, count:', 
          dbObjects.tables.length + dbObjects.views.length + dbObjects.procedures.length);
        
        try {
          await updateDatabaseObjects(savedService._id, dbObjects);
          console.log('Database objects saved to MongoDB');
        } catch (updateError) {
          console.error('Error updating database objects:', updateError);
          // Continue with service creation even if schema update fails
        }
      } catch (schemaError) {
        console.error('Error fetching database schema:', schemaError);
        // Continue with service creation even if schema fetch fails
      }

      // Return the service info even if schema fetch/update fails
      res.status(201).json(savedService);
    } catch (encryptionError) {
      console.error('Error in password encryption or service saving:', encryptionError);
      res.status(500).json({ message: 'Error processing service data: ' + encryptionError.message });
    }
  } catch (error) {
    console.error('Error creating service:', error);
    // Log detailed error information
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
    if (error.code) {
      console.error('Error code:', error.code);
    }
    if (error.cause) {
      console.error('Error cause:', error.cause);
    }
    
    res.status(500).json({ 
      message: 'Failed to create service: ' + error.message,
      errorCode: error.code || 'UNKNOWN'
    });
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
   console.log('Update service request received for ID:', req.params.id);
   
   // Find the existing service
   const existingService = await Service.findById(req.params.id);
   if (!existingService) {
     console.log('Service not found:', req.params.id);
     return res.status(404).json({ message: 'Service not found' });
   }
   
   // Create update data
   const updateData = { ...req.body };
   
   // Handle password separately
   if (updateData.password) {
     console.log('Password update detected, handling encryption');
     
     // Only encrypt if it's a new password (not already encrypted)
     if (!updateData.password.includes(':')) {
       console.log('New password provided, encrypting');
       try {
         updateData.password = encryptDatabasePassword(updateData.password);
         console.log('Password encrypted successfully');
       } catch (encryptError) {
         console.error('Failed to encrypt password:', encryptError);
         return res.status(500).json({ message: 'Failed to encrypt password: ' + encryptError.message });
       }
     } else {
       console.log('Password appears to already be encrypted (contains colon), skipping encryption');
     }
   } else {
     console.log('No password update, keeping existing password');
     delete updateData.password; // Remove password from update data if not provided
   }
   
   console.log('Updating service with data:', {
     ...updateData,
     password: updateData.password ? '[REDACTED]' : undefined
   });
   
   const service = await Service.findByIdAndUpdate(
     req.params.id,
     { $set: updateData },
     { new: true }
   );
   
   console.log('Service updated successfully');
   res.json(service);
 } catch (error) {
   console.error('Error updating service:', error);
   if (error.stack) {
     console.error('Stack trace:', error.stack);
   }
   res.status(500).json({ message: 'Error updating service: ' + error.message });
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