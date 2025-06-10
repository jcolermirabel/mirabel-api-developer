const express = require('express');
const router = express.Router();
const Service = require('../models/Service');
const Connection = require('../models/Connection');
const databaseService = require('../services/databaseService');
const { encryptDatabasePassword, decryptDatabasePassword } = require('../utils/encryption');
const { logger } = require('../utils/logger');
const DatabaseObject = require('../models/DatabaseObject');
const { authMiddleware } = require('../middleware/auth');
const { fetchDatabaseObjects, updateDatabaseObjects } = require('../utils/schemaUtils');

async function refreshServiceSchema(serviceId) {
  const service = await Service.findById(serviceId).select('+password');
  if (!service) {
    throw new Error('Service not found for schema refresh');
  }

  let connectionDetails = {};
  let connectionName = null;

  if (service.connectionId) {
    const connection = await Connection.findById(service.connectionId).select('+password');
    if (!connection) {
      throw new Error('Connection not found for this service');
    }
    connectionName = connection.name;
    connectionDetails = {
      host: connection.host,
      port: connection.port,
      username: connection.username,
      password: connection.password,
    };
  } else {
    // Fallback for older services without a connectionId
    connectionDetails = {
      host: service.host,
      port: service.port,
      username: service.username,
      password: service.password,
    };
  }

  if (!connectionDetails.password) {
    throw new Error('Could not determine password for service.');
  }

  let decryptedPassword;
  try {
    decryptedPassword = decryptDatabasePassword(connectionDetails.password);
  } catch (e) {
    if (!service.connectionId) {
      throw new Error('This service uses an outdated credential format and cannot be refreshed. Please edit it and associate it with a valid Connection.');
    }
    throw new Error(`The password for the associated connection "${connectionName}" appears to be corrupt. Please go to the Connections page, edit this connection, and re-save its password.`);
  }

  const config = {
    user: connectionDetails.username,
    password: decryptedPassword,
    server: connectionDetails.host,
    port: parseInt(connectionDetails.port, 10),
    database: service.database,
    options: {
      encrypt: true,
      trustServerCertificate: process.env.NODE_ENV !== 'production'
    }
  };

  const dbObjects = await fetchDatabaseObjects(config);
  const updateResult = await updateDatabaseObjects(service._id, dbObjects);

  return {
    serviceName: service.name,
    ...updateResult
  };
}

router.use(authMiddleware);

router.post('/', async (req, res) => {
  try {
    const { name, connectionId, database } = req.body;

    if (!name || !connectionId || !database) {
      return res.status(400).json({ message: 'Missing required fields: name, connectionId, database' });
    }
    
    const connection = await Connection.findById(connectionId).select('+password');
    if (!connection) {
      return res.status(404).json({ message: 'Associated connection not found' });
    }
    
    // Create new service with details from the connection
    const service = new Service({
      name,
      database,
      connectionId,
      // Carry over connection details for reference, but not for direct use
      host: connection.host,
      port: connection.port,
      username: connection.username,
      password: connection.password, // This is the encrypted password
      failoverHost: connection.failoverHost,
      createdBy: req.user.userId
    });
    
    const savedService = await service.save();

    // Asynchronously refresh the schema after creating the service
    // No need to await this, can run in the background
    refreshServiceSchema(savedService._id).catch(err => {
      logger.error(`Post-creation schema refresh failed for service ${savedService._id}`, err);
    });

    res.status(201).json(savedService);

  } catch (error) {
    logger.error('Error creating service:', error);
    res.status(500).json({ 
      message: 'Failed to create service',
      error: error.message 
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
    const result = await refreshServiceSchema(req.params.id);
    res.json(result);
  } catch (error) {
    logger.error('Schema refresh error:', error);
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