const express = require('express');
const router = express.Router();
const Application = require('../models/Application');
const crypto = require('crypto');

// Get all applications
router.get('/', async (req, res) => {
  try {
    const applications = await Application.find()
      .populate('defaultRole', 'name')
      .populate('createdBy', 'email');
    res.json(applications);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch applications' });
  }
});

// Create new application
router.post('/', async (req, res) => {
  try {
    const { name, description, defaultRole, isActive } = req.body;
    
    // Generate API key
    const apiKey = crypto.randomBytes(32).toString('hex');

    const application = new Application({
      name,
      description,
      defaultRole,
      apiKey,
      isActive,
      createdBy: req.user.userId
    });

    await application.save();
    
    const populatedApp = await Application.findById(application._id)
      .populate('defaultRole', 'name')
      .populate('createdBy', 'email');

    res.status(201).json(populatedApp);
  } catch (error) {
    res.status(500).json({ message: 'Failed to create application' });
  }
});

// Update application
router.put('/:id', async (req, res) => {
  try {
    const { name, description, defaultRole, isActive } = req.body;
    
    const application = await Application.findByIdAndUpdate(
      req.params.id,
      { name, description, defaultRole, isActive },
      { new: true }
    )
    .populate('defaultRole', 'name')
    .populate('createdBy', 'email');

    res.json(application);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update application' });
  }
});

// Delete application
router.delete('/:id', async (req, res) => {
  try {
    await Application.findByIdAndDelete(req.params.id);
    res.json({ message: 'Application deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete application' });
  }
});

// Regenerate API key
router.post('/:id/regenerate-key', async (req, res) => {
  try {
    const newApiKey = crypto.randomBytes(32).toString('hex');
    
    const application = await Application.findByIdAndUpdate(
      req.params.id,
      { apiKey: newApiKey },
      { new: true }
    )
    .populate('defaultRole', 'name')
    .populate('createdBy', 'email');

    res.json(application);
  } catch (error) {
    res.status(500).json({ message: 'Failed to regenerate API key' });
  }
});

module.exports = router; 