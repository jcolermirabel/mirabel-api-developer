const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { logger } = require('../utils/logger');

// Register
router.post('/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName, isAdmin } = req.body;

    // Validate required fields
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create new user
    const user = new User({
      email,
      password,  // Will be hashed by the model's pre-save middleware
      firstName,
      lastName,
      isAdmin: isAdmin || false,
      isActive: true
    });

    await user.save();

    // Generate token
    const token = jwt.sign(
      { 
        userId: user._id,
        isAdmin: user.isAdmin
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isAdmin: user.isAdmin
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Error registering user', error: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  
  console.log('=== Login Request ===');
  console.log('Headers:', req.headers);
  console.log('Body:', { email });
  console.log('Looking for user with email:', email);
  
  try {
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    console.log('Looking for user with email:', email);
    const user = await User.findOne({ email });
    
    if (!user) {
      console.log('User not found:', email);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    console.log('Found user, comparing passwords');
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      console.log('Invalid password for user:', email);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    console.log('Password matched, generating token');
    const token = jwt.sign(
      { 
        userId: user._id,
        isAdmin: user.isAdmin
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    const userData = {
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      isAdmin: user.isAdmin,
      isActive: true,
      lastLogin: new Date()
    };

    res.json({
      token,
      user: userData
    });
  } catch (error) {
    console.error('Login error:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ 
      message: 'Server error during login',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Refresh token
router.post('/refresh', async (req, res) => {
  logger.info('Token refresh requested', {
    headers: req.headers,
    cookies: req.cookies
  });

  try {
    const oldToken = req.headers.authorization?.split(' ')[1];
    if (!oldToken) {
      logger.error('No token provided for refresh');
      return res.status(401).json({ message: 'No token provided' });
    }

    // Verify the old token
    try {
      const decoded = jwt.verify(oldToken, process.env.JWT_SECRET, { ignoreExpiration: true });
      logger.info('Old token decoded', {
        userId: decoded.userId,
        exp: new Date(decoded.exp * 1000)
      });

      // Generate new token
      const newToken = jwt.sign(
        { userId: decoded.userId },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      logger.info('New token generated');
      res.json({ token: newToken });
    } catch (error) {
      logger.error('Token refresh failed', {
        error: error.message,
        name: error.name
      });
      res.status(401).json({ message: 'Invalid token' });
    }
  } catch (error) {
    logger.error('Refresh endpoint error', error);
    res.status(500).json({ message: 'Token refresh failed' });
  }
});

// Logout
router.post('/logout', async (req, res) => {
  // Clear the auth cookie
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  });
  
  if (req.session) {
    req.session.destroy(err => {
      if (err) {
        console.error('Session destroy error:', err);
      }
    });
  }
  
  // Always return success
  res.json({ message: 'Logged out successfully' });
});

module.exports = router; 