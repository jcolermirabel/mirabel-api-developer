const express = require('express');
const router = express.Router();
const Role = require('../models/Role');
const { authMiddleware } = require('../middleware/auth'); // Import specifically authMiddleware
const { fetchSchemaFromDatabase } = require('../utils/schemaUtils');
const { logger } = require('../middleware/logger');

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
    const role = new Role({
      ...req.body,
      createdBy: req.user.userId
    });

    // Fetch schemas for each permission
    for (const permission of role.permissions) {
      try {
        const schema = await fetchSchemaFromDatabase(permission.service, permission.objectName);
        permission.schema = schema;
      } catch (error) {
        logger.warn(`Failed to fetch schema for ${permission.objectName}`, error);
      }
    }

    await role.save();
    res.status(201).json(role);
  } catch (error) {
    res.status(500).json({ message: 'Failed to create role' });
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

module.exports = router; 