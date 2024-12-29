const express = require('express');
const router = express.Router();
const Service = require('../models/Service');
const Role = require('../models/Role');
const Application = require('../models/Application');
const { generateApiKey } = require('../utils/encryption');
const { isAdmin } = require('../middleware/auth');

// POST /api/imports/bulk
router.post('/bulk', isAdmin, async (req, res) => {
  try {
    const { databases } = req.body;
    const results = {
      services: [],
      roles: [],
      applications: []
    };

    for (const db of databases) {
      // Create service for each database
      const service = new Service({
        name: db.name,
        host: db.host,
        port: db.port,
        database: db.name,
        username: db.username,
        password: db.password,
        isActive: true,
        createdBy: req.user._id
      });
      await service.save();
      results.services.push(service);

      // Create role with components
      const role = new Role({
        name: `${db.name}_Role`,
        description: `Auto-generated role for ${db.name}`,
        serviceId: service._id,
        permissions: db.components.map(comp => ({
          serviceId: service._id,
          objectName: comp,
          actions: { GET: true, POST: true, PUT: true, DELETE: true }
        })),
        isActive: true,
        createdBy: req.user._id
      });
      await role.save();
      results.roles.push(role);

      // Create application with auto-generated API key
      const application = new Application({
        name: `${db.name}_App`,
        description: `Auto-generated application for ${db.name}`,
        apiKey: await generateApiKey(),
        defaultRole: role._id,
        isActive: true,
        createdBy: req.user._id
      });
      await application.save();
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