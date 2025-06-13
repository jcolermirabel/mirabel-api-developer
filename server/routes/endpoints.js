const express = require('express');
const router = express.Router();
const Endpoint = require('../models/Endpoint');
const { authMiddleware } = require('../middleware/auth');

// Apply auth middleware to all endpoint routes
router.use(authMiddleware);

// GET all endpoints
router.get('/', async (req, res) => {
  try {
    const endpoints = await Endpoint.find().sort({ name: 1 });
    res.json(endpoints);
  } catch (error) {
    console.error('Error fetching endpoints:', error);
    res.status(500).json({ message: 'Failed to fetch endpoints' });
  }
});

// POST create a new endpoint
router.post('/', async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) {
      return res.status(400).json({ message: 'Endpoint name is required.' });
    }
    const newEndpoint = new Endpoint({ name, description });
    await newEndpoint.save();
    res.status(201).json(newEndpoint);
  } catch (error) {
    console.error('Error creating endpoint:', error);
    res.status(500).json({ message: 'Failed to create endpoint' });
  }
});

module.exports = router; 