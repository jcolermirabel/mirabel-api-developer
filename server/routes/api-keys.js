const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const ApiKey = require('../models/ApiKey');
const Endpoint = require('../models/Endpoint');
const { authMiddleware } = require('../middleware/auth');

// Apply auth middleware to all routes
router.use(authMiddleware);

// Get all API keys for an endpoint
router.get('/endpoint/:endpointId', async (req, res) => {
  try {
    const { endpointId } = req.params;

    // Validate endpointId
    if (!mongoose.Types.ObjectId.isValid(endpointId)) {
      return res.status(400).json({ message: 'Invalid endpoint ID format' });
    }

    // Check if endpoint exists
    const endpoint = await Endpoint.findById(endpointId);
    if (!endpoint) {
      return res.status(404).json({ message: 'Endpoint not found' });
    }

    const apiKeys = await ApiKey.find({ endpointId, isActive: true })
      .select('-__v')
      .sort('-createdAt');

    res.json(apiKeys);
  } catch (error) {
    console.error('Error fetching API keys:', error);
    res.status(500).json({ message: 'Failed to fetch API keys' });
  }
});

// Generate new API key for an endpoint
router.post('/endpoint/:endpointId', async (req, res) => {
  try {
    const { endpointId } = req.params;

    // Validate endpointId
    if (!mongoose.Types.ObjectId.isValid(endpointId)) {
      return res.status(400).json({ message: 'Invalid endpoint ID format' });
    }

    // Check if endpoint exists
    const endpoint = await Endpoint.findById(endpointId);
    if (!endpoint) {
      return res.status(404).json({ message: 'Endpoint not found' });
    }

    // Deactivate any existing active keys for this endpoint
    await ApiKey.updateMany(
      { endpointId, isActive: true },
      { isActive: false }
    );

    // Create new API key
    const apiKey = new ApiKey({
      endpointId,
      createdBy: req.user.userId
    });

    await apiKey.save();

    res.status(201).json(apiKey);
  } catch (error) {
    console.error('Error generating API key:', error);
    res.status(500).json({ message: 'Failed to generate API key' });
  }
});

// Revoke an API key
router.delete('/:keyId', async (req, res) => {
  try {
    const { keyId } = req.params;

    // Validate keyId
    if (!mongoose.Types.ObjectId.isValid(keyId)) {
      return res.status(400).json({ message: 'Invalid API key ID format' });
    }

    const apiKey = await ApiKey.findById(keyId);
    if (!apiKey) {
      return res.status(404).json({ message: 'API key not found' });
    }

    // Soft delete by marking as inactive
    apiKey.isActive = false;
    await apiKey.save();

    res.json({ message: 'API key revoked successfully' });
  } catch (error) {
    console.error('Error revoking API key:', error);
    res.status(500).json({ message: 'Failed to revoke API key' });
  }
});

module.exports = router; 