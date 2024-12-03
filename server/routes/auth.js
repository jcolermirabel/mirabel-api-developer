const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { logger } = require('../utils/logger');

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  
  // Generate hash early
  const hashedPassword = await bcrypt.hash(password, 10);
  
  console.log('=== Login Request ===');
  console.log('Headers:', req.headers);
  console.log('Body:', { 
    email: email, 
    password: hashedPassword // Show hashed value
  });
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
    // Generate CSRF token
    const csrfToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
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

    // Set session if available
    if (req.session) {
      req.session.user = userData;
      
      req.session.save((err) => {
        if (err) {
          console.error('Session save error:', err);
        }
      });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: '7d'  // Token expires in 7 days
    });

    // Set token as HTTP-only cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds
    });

    // Send response regardless of session status
    res.json({
      token: csrfToken,
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