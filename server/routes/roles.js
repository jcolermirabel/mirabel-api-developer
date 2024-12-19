const express = require('express');
const router = express.Router();
const Role = require('../models/Role');
const { authMiddleware } = require('../middleware/auth'); // Import specifically authMiddleware
const { fetchSchemaFromDatabase } = require('../utils/schemaUtils');
const { logger } = require('../middleware/logger');
const Service = require('../models/Service');
const DatabaseObject = require('../models/DatabaseObject');

// Apply auth middleware to all routes
router.use(authMiddleware);

// Get all roles
router.get('/', async (req, res) => {
  try {
    const roles = await Role.find().populate('createdBy', 'firstName lastName');
    res.json(roles);
  } catch (error) {
    console.error('Error fetching roles:', error);
    res.status(500).json({ message: 'Failed to fetch roles' });
  }
});

// Get a single role by ID
router.get('/:id', async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);
    if (!role) {
      return res.status(404).json({ message: 'Role not found' });
    }
    res.json(role);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch role' });
  }
});

// Create new role
router.post('/', async (req, res) => {
  try {
    console.log('Creating role with data:', req.body);

    const role = new Role({
      ...req.body,
      createdBy: req.user.userId
    });

    // Validate service exists
    const service = await Service.findById(role.serviceId);
    if (!service) {
      console.error('Service not found:', role.serviceId);
      return res.status(404).json({ message: 'Service not found' });
    }

    // Validate permissions
    if (!role.permissions || !Array.isArray(role.permissions)) {
      console.error('Invalid permissions format:', role.permissions);
      return res.status(400).json({ message: 'Invalid permissions format' });
    }

    // Log validation before save
    console.log('Role before save:', role.toObject());

    await role.save();
    console.log('Role saved successfully:', role._id);

    res.status(201).json(role);
  } catch (error) {
    console.error('Error creating role:', {
      error: error.message,
      stack: error.stack,
      name: error.name
    });
    res.status(500).json({ 
      message: 'Failed to create role',
      details: error.message 
    });
  }
});

// Update role
router.put('/:id', async (req, res) => {
  try {
    const role = await Role.findByIdAndUpdate(
      req.params.id,
      { ...req.body },
      { new: true }
    );
    res.json(role);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update role' });
  }
});

// Delete role
router.delete('/:id', async (req, res) => {
  try {
    await Role.findByIdAndDelete(req.params.id);
    res.json({ message: 'Role deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete role' });
  }
});

// Refresh service schema
router.post('/:id/refresh-schema', async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }
    const schema = await fetchSchemaFromDatabase(service);
    service.schema = schema;
    await service.save();
    res.json(service);
  } catch (error) {
    res.status(500).json({ message: 'Failed to refresh service schema' });
  }
});

// Get service schema
router.get('/service/:id/schema', async (req, res) => {
  try {
    console.log('Fetching database objects for service:', req.params.id);
    
    // Get the database objects document for this service
    const dbObjects = await DatabaseObject.findOne({ 
      serviceId: req.params.id 
    }).lean();
    
    if (!dbObjects || !dbObjects.objects) {
      console.log('No objects found for service');
      return res.json({ tables: [], views: [], procedures: [] });
    }
    
    console.log(`Found ${dbObjects.objects.length} objects`);

    // Transform the objects array into the expected schema format
    const schema = {
      tables: dbObjects.objects
        .filter(obj => obj.path.startsWith('/table/'))
        .map(t => ({ 
          name: t.path.split('/').pop(), 
          path: t.path 
        })),
      views: dbObjects.objects
        .filter(obj => obj.path.startsWith('/view/'))
        .map(v => ({ 
          name: v.path.split('/').pop(), 
          path: v.path 
        })),
      procedures: dbObjects.objects
        .filter(obj => obj.path.startsWith('/proc/'))
        .map(p => ({ 
          name: p.path.split('/').pop(), 
          path: p.path 
        }))
    };
    
    console.log('Schema object counts:', {
      tables: schema.tables.length,
      views: schema.views.length,
      procedures: schema.procedures.length
    });

    res.json(schema);
    
  } catch (error) {
    console.error('Route error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch database objects',
      error: error.message
    });
  }
});

module.exports = router; 