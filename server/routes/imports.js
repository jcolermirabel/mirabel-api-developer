const express = require('express');
const router = express.Router();
const Service = require('../models/Service');
const Role = require('../models/Role');
const Application = require('../models/Application');
const DatabaseObject = require('../models/DatabaseObject');
const { generateApiKey, encryptDatabasePassword } = require('../utils/encryption');
const { authMiddleware, adminOnly } = require('../middleware/auth');
const databaseService = require('../services/databaseService');

// POST /api/imports/bulk
router.post('/bulk', authMiddleware, adminOnly, async (req, res) => {
  try {
    const results = {
      services: [],
      roles: [],
      applications: []
    };

    // Process each database in the import
    for (const db of req.body.databases) {
      const dbName = db.name;
      
      // Find or create service
      let service = await Service.findOne({ name: dbName });
      
      if (service) {
        // Update existing service
        service.host = db.host;
        service.failoverHost = db.failoverHost;
        service.port = db.port;
        service.database = db.database;
        service.username = db.username;
        service.password = encryptDatabasePassword(db.password);
        service.isActive = true;
        service.updatedBy = req.user.userId;
        await service.save();
      } else {
        // Create new service
        service = new Service({
          name: dbName,
          host: db.host,
          failoverHost: db.failoverHost,
          port: db.port,
          database: db.database,
          username: db.username,
          password: encryptDatabasePassword(db.password),
          isActive: true,
          createdBy: req.user.userId
        });
        await service.save();
      }
      results.services.push(service);

      // Fetch and store database objects
      try {
        const objects = await databaseService.getDatabaseObjects(service);
        
        // Transform objects into the format needed for DatabaseObject, sorted by type
        const transformedObjects = [
          // Procedures first
          ...objects.filter(obj => obj.object_category === 'PROCEDURE')
            .map(obj => ({
              path: `/proc/${obj.name}`
            })),
          // Then views
          ...objects.filter(obj => obj.object_category === 'VIEW')
            .map(obj => ({
              path: `/view/${obj.name}`
            })),
          // Then tables
          ...objects.filter(obj => obj.object_category === 'TABLE')
            .map(obj => ({
              path: `/table/${obj.name}`
            }))
        ];

        // Create or update DatabaseObject
        await DatabaseObject.findOneAndUpdate(
          { serviceId: service._id },
          { 
            serviceId: service._id,
            objects: transformedObjects
          },
          { upsert: true, new: true }
        );
      } catch (error) {
        console.error(`Failed to fetch schema for service ${dbName}:`, error);
      }

      // Find or create role
      let role = await Role.findOne({
        name: dbName,
        serviceId: service._id
      });
      
      if (role) {
        // Update existing role
        role.description = 'Imported';
        role.permissions = db.components.map(comp => ({
          serviceId: service._id,
          objectName: `/proc/${comp.objectName}`,
          actions: comp.actions || {
            GET: true,
            POST: false,
            PUT: false,
            DELETE: false,
            PATCH: false
          }
        }));
        role.isActive = true;
        role.updatedBy = req.user.userId;
        await role.save();
      } else {
        // Create new role
        role = new Role({
          name: dbName,
          description: 'Imported',
          serviceId: service._id,
          permissions: db.components.map(comp => ({
            serviceId: service._id,
            objectName: `/proc/${comp.objectName}`,
            actions: comp.actions || {
              GET: true,
              POST: false,
              PUT: false,
              DELETE: false,
              PATCH: false
            }
          })),
          isActive: true,
          createdBy: req.user.userId
        });
        await role.save();
      }
      results.roles.push(role);

      // Find or create application
      let application = await Application.findOne({
        name: dbName
      });
      
      if (application) {
        // Update existing application
        application.description = 'Imported';
        application.defaultRole = role._id;
        application.isActive = true;
        application.updatedBy = req.user.userId;
        await application.save();
      } else {
        // Create new application
        application = new Application({
          name: dbName,
          description: 'Imported',
          apiKey: await generateApiKey(),
          defaultRole: role._id,
          isActive: true,
          createdBy: req.user.userId
        });
        await application.save();
      }
      results.applications.push(application);
    }

    res.json({
      message: 'Import completed successfully',
      results
    });
  } catch (error) {
    console.error('Import error:', error);
    res.status(500).json({ 
      message: 'Import failed',
      error: error.message
    });
  }
});

module.exports = router; 