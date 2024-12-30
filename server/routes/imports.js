const express = require('express');
const router = express.Router();
const Service = require('../models/Service');
const Role = require('../models/Role');
const Application = require('../models/Application');
const { generateApiKey } = require('../utils/encryption');
const { authMiddleware, isAdmin } = require('../middleware/auth');

// POST /api/imports/bulk
router.post('/bulk', [authMiddleware, isAdmin], async (req, res) => {
  try {
    const { databases } = req.body;
    const results = {
      services: [],
      roles: [],
      applications: []
    };

    // Group components and actions by database
    const databaseMap = new Map();
    for (const entry of databases) {
      if (!databaseMap.has(entry.name)) {
        databaseMap.set(entry.name, {
          ...entry,
          components: []
        });
      }
      
      const db = databaseMap.get(entry.name);
      const actions = {
        GET: entry.actions.includes('GET'),
        POST: entry.actions.includes('POST'),
        PUT: entry.actions.includes('PUT'),
        DELETE: entry.actions.includes('DELETE')
      };
      
      db.components.push({
        objectName: entry.component,
        actions
      });
    }

    // Process each unique database
    for (const [dbName, db] of databaseMap) {
      // Find or create service for each database
      let service = await Service.findOne({ name: dbName });
      
      if (service) {
        // Update existing service
        service.host = db.host;
        service.failoverHost = db.failoverHost;
        service.port = db.port;
        service.username = db.username;
        service.password = db.password;
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
          database: dbName,
          username: db.username,
          password: db.password,
          isActive: true,
          createdBy: req.user.userId
        });
        await service.save();
      }
      results.services.push(service);

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
          objectName: comp.objectName,
          actions: comp.actions
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
            objectName: comp.objectName,
            actions: comp.actions
          })),
          isActive: true,
          createdBy: req.user.userId
        });
        await role.save();
      }
      results.roles.push(role);

      // Find or create application
      let application = await Application.findOne({
        name: dbName,
        defaultRole: role._id
      });

      if (application) {
        // Update existing application
        application.description = 'Imported';
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
      message: 'Bulk import successful',
      results
    });
  } catch (error) {
    console.error('Bulk import error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 