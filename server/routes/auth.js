const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const UserLog = require('../models/UserLog');
const { logger } = require('../utils/logger');
const { validate } = require('../middleware/validation');
const validationRules = require('../middleware/validationRules');
const { body } = require('express-validator');
const crypto = require('crypto');
const { generateTokens, validateToken, blacklistToken } = require('../utils/tokenService');

/**
 * Helper function to determine if an email address should have admin privileges
 * @param {string} email - The email address to check
 * @returns {boolean} - True if the email should have admin privileges
 */
function isAdminEmail(email) {
  if (!email) return false;
  
  const adminEmails = [
    'jcoler@mirabeltechnologies.com',
    'sa@magazinemanager.com'
  ];
  
  return adminEmails.includes(email.toLowerCase());
}

// Register validation rules
const registerValidation = [
  body('email')
    .isEmail().withMessage('Must be a valid email address')
    .normalizeEmail({ gmail_remove_dots: false })
    .trim(),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
    .matches(/\d/).withMessage('Password must contain at least one number')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter'),
  body('firstName')
    .isString().withMessage('First name must be a string')
    .trim()
    .notEmpty().withMessage('First name is required'),
  body('lastName')
    .isString().withMessage('Last name must be a string')
    .trim()
    .notEmpty().withMessage('Last name is required'),
  body('isAdmin')
    .optional()
    .isBoolean().withMessage('isAdmin must be a boolean value')
];

// Register
router.post('/register', validate(registerValidation), async (req, res) => {
  try {
    const { email, password, firstName, lastName, isAdmin } = req.validatedData;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Determine user type based on isAdmin flag
    const userType = isAdmin ? 'admin' : 'user';

    // Create new user
    const user = new User({
      email,
      password,  // Will be hashed by the model's pre-save middleware
      firstName,
      lastName,
      isAdmin: isAdmin || false,
      userType,
      isActive: true
    });

    await user.save();

    // Generate tokens for new security system
    const tokens = generateTokens({
      userId: user._id,
      isAdmin: user.isAdmin,
      userType: user.userType
    });

    // Backwards compatibility: also provide old-style token
    const legacyToken = jwt.sign(
      { 
        userId: user._id,
        isAdmin: user.isAdmin,
        userType: user.userType
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      // New token format
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: 14400, // 4 hours in seconds
      // Backwards compatibility
      token: legacyToken,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isAdmin: user.isAdmin,
        userType: user.userType
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Error registering user', error: error.message });
  }
});

// Login with security monitoring
router.post('/login', validate(validationRules.auth.login), async (req, res) => {
  const { email, password } = req.validatedData;
  const originalEmail = req.body.email; // Get original email without normalization
  const ipAddress = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
                   req.connection.remoteAddress || 
                   req.ip || 
                   'unknown';
  const userAgent = req.headers['user-agent'] || 'unknown';
  
  console.log('=== Login Request ===');
  console.log('Body:', { email: originalEmail });
  
  try {
    // Security: Check if account is locked due to failed attempts
    if (isAccountLocked(originalEmail, ipAddress)) {
      await trackFailedLogin(originalEmail, ipAddress, userAgent);
      return res.status(429).json({ 
        message: 'Account temporarily locked due to multiple failed login attempts. Please try again later.',
        lockoutDuration: LOCKOUT_DURATION / 60000 // Return duration in minutes
      });
    }
    
    // Check if user exists in MongoDB for LOCAL authentication
    console.log('Checking MongoDB for user:', email);
    let user = await User.findOne({ email });
    
    // If not found with normalized email, try original email
    if (!user && email !== originalEmail) {
      user = await User.findOne({ email: originalEmail });
    }
    
    // PRIMARY: Local MongoDB authentication
    if (user && user.isActive) {
      console.log('User found in MongoDB, checking password');
      
      // Check password against stored hash
      const isMatch = await bcrypt.compare(password, user.password);
      
      if (isMatch) {
        // Clear failed attempts on successful login
        clearFailedAttempts(originalEmail, ipAddress);
        
        console.log('Local authentication successful');
        
        // Determine admin status
        const isAdmin = isAdminEmail(originalEmail);
        user.isAdmin = isAdmin;
        user.userType = isAdmin ? 'admin' : 'user';
        
        // Generate tokens for locally authenticated user
        const tokens = generateTokens({
          userId: user._id,
          isAdmin: user.isAdmin,
          userType: user.userType
        });
        
        // Update lastLogin and log the event
        user.lastLogin = new Date();
        await user.save();
        
        // Log the login
        await UserLog.create({
          userId: user._id,
          email: user.email,
          action: 'login',
          ipAddress,
          userAgent,
          timestamp: new Date(),
          details: {
            authMethod: 'local'
          }
        });
        
        return res.json({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresIn: 14400, // 4 hours in seconds
          // Backwards compatibility: also provide legacy token  
          token: tokens.accessToken,
          user: {
            id: user._id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            isAdmin: user.isAdmin,
            userType: user.userType,
            isActive: true,
            lastLogin: user.lastLogin,
            mirabelConnect: user.mirabelConnect || {}
          }
        });
      }
    }
    
    // FALLBACK: Try external API authentication only if local auth fails and API is configured
    console.log('Local authentication failed, checking if external API is configured...');
    
    const { authenticateUser } = require('../mirabel-proxy');
    
    try {
      // Check if we have a valid API key configured for external authentication
      const apiKey = process.env.MIRABEL_API_KEY || process.env.MIRABEL_CONNECT_API_KEY;
      
      if (!apiKey || apiKey === 'local-development-key' || apiKey === 'your-mirabel-connect-api-key') {
        console.log('No valid external API key configured, skipping external authentication');
        throw new Error('External API not configured - local authentication only');
      }
      
      console.log('Attempting external API authentication for:', originalEmail);
      
      // Authenticate using the Mirabel Connect API
      const apiResult = await authenticateUser(originalEmail, password);
      
      if (apiResult.success) {
        // Clear failed attempts on successful login
        clearFailedAttempts(originalEmail, ipAddress);
        
        const apiUser = apiResult.user;
        console.log('User authenticated via external Mirabel Connect API');
        console.log('API user data keys:', Object.keys(apiUser));
        
        // Determine if user is admin based on email
        const isAdmin = isAdminEmail(originalEmail);
        
        console.log(`Setting admin privileges: ${isAdmin} for email: ${originalEmail}`);
        
        // Create/update user record from API data
        if (!user) {
          console.log('Creating user record in MongoDB from API data');
          
          user = new User({
            email: originalEmail,
            password: password, // Will be hashed by pre-save middleware
            firstName: apiUser.firstName || apiUser.FirstName,
            lastName: apiUser.lastName || apiUser.LastName,
            isAdmin: isAdmin,
            userType: isAdmin ? 'admin' : 'user',
            isActive: true,
            mirabelConnect: {
              gsEmployeesID: apiUser.gsEmployeesID || apiUser.EmployeeID,
              clientID: apiUser.ClientID,
              databaseName: apiUser.DatabaseName,
              serverName: apiUser.Servername,
              accessibleDatabases: apiUser.accessibleDatabases || []
            },
            roles: [],
            ownedServices: []
          });
          
          await user.save();
          console.log('User created in MongoDB from API data');
        } else {
          // Update existing user record with API data
          user.isAdmin = isAdmin;
          user.userType = isAdmin ? 'admin' : 'user';
          user.mirabelConnect = {
            gsEmployeesID: apiUser.gsEmployeesID || apiUser.EmployeeID,
            clientID: apiUser.ClientID,
            databaseName: apiUser.DatabaseName,
            serverName: apiUser.Servername,
            accessibleDatabases: apiUser.accessibleDatabases || []
          };
          
          await user.save();
          console.log('Updated user record in MongoDB with API data');
        }
        
        // Generate tokens for API-authenticated user
        const tokens = generateTokens({
          userId: user._id, 
          isAdmin: user.isAdmin, 
          userType: user.userType 
        });
        
        // Update lastLogin and log the event
        user.lastLogin = new Date();
        await user.save();
        
        // Log the login
        await UserLog.create({
          userId: user._id,
          email: user.email,
          action: 'login',
          ipAddress,
          userAgent,
          timestamp: new Date(),
          details: {
            authMethod: 'external_api'
          }
        });
        
        // Return API user data with secure tokens
        return res.json({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresIn: 14400, // 4 hours in seconds
          // Backwards compatibility: also provide legacy token  
          token: tokens.accessToken,
          user: {
            id: user._id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            isAdmin: user.isAdmin,
            userType: user.userType,
            isActive: true,
            lastLogin: user.lastLogin,
            mirabelConnect: user.mirabelConnect
          }
        });
      }
    } catch (error) {
      console.error('External API authentication error (fallback):', error);
      // Continue to failed authentication handling below
    }
    
    // Both local and external authentication failed - track failed attempt
    const attemptCount = await trackFailedLogin(originalEmail, ipAddress, userAgent);
    
    console.log('All authentication methods failed');
    
    // Provide appropriate response based on attempt count
    if (attemptCount >= MAX_FAILED_ATTEMPTS - 1) {
      return res.status(429).json({ 
        message: 'Too many failed login attempts. Account will be temporarily locked.',
        attemptsRemaining: MAX_FAILED_ATTEMPTS - attemptCount
      });
    }
    
    return res.status(401).json({ 
      message: 'Invalid email or password',
      attemptsRemaining: MAX_FAILED_ATTEMPTS - attemptCount
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

// Refresh token validation rules
const refreshTokenValidation = [
  body('token')
    .optional()
    .isJWT().withMessage('Invalid token format')
];

// Security monitoring and failed login tracking
const FAILED_LOGIN_ATTEMPTS = new Map(); // In production, use Redis
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes
const SUSPICIOUS_ACTIVITY_THRESHOLD = 10; // Multiple failed attempts from same IP

// Track failed login attempt
const trackFailedLogin = async (email, ipAddress, userAgent) => {
  const key = `${email}:${ipAddress}`;
  const now = Date.now();
  
  if (!FAILED_LOGIN_ATTEMPTS.has(key)) {
    FAILED_LOGIN_ATTEMPTS.set(key, []);
  }
  
  const attempts = FAILED_LOGIN_ATTEMPTS.get(key);
  attempts.push(now);
  
  // Clean old attempts (older than lockout duration)
  const recentAttempts = attempts.filter(timestamp => now - timestamp < LOCKOUT_DURATION);
  FAILED_LOGIN_ATTEMPTS.set(key, recentAttempts);
  
  // Log failed login attempt
  try {
    await UserLog.create({
      email,
      action: 'failed_login',
      ipAddress,
      userAgent,
      timestamp: new Date(),
      details: {
        attemptCount: recentAttempts.length,
        suspicious: recentAttempts.length >= SUSPICIOUS_ACTIVITY_THRESHOLD
      }
    });
  } catch (error) {
    console.error('Error logging failed login:', error);
  }
  
  return recentAttempts.length;
};

// Check if account is locked
const isAccountLocked = (email, ipAddress) => {
  const key = `${email}:${ipAddress}`;
  const attempts = FAILED_LOGIN_ATTEMPTS.get(key) || [];
  const now = Date.now();
  
  const recentAttempts = attempts.filter(timestamp => now - timestamp < LOCKOUT_DURATION);
  return recentAttempts.length >= MAX_FAILED_ATTEMPTS;
};

// Clear failed attempts on successful login
const clearFailedAttempts = (email, ipAddress) => {
  const key = `${email}:${ipAddress}`;
  FAILED_LOGIN_ATTEMPTS.delete(key);
};

// Refresh token with enhanced security
router.post('/refresh', validate(refreshTokenValidation), async (req, res) => {
  try {
    const refreshToken = req.headers.authorization?.split(' ')[1] || req.body.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ message: 'No refresh token provided' });
    }

    // Validate the refresh token
    try {
      const decoded = validateToken(refreshToken);
      
      // Verify it's a refresh token
      if (decoded.type !== 'refresh') {
        return res.status(401).json({ message: 'Invalid token type' });
      }
      
      // Blacklist the old refresh token
      blacklistToken(refreshToken);
      
      // Generate new tokens
      const tokens = generateTokens({
        userId: decoded.userId,
        isAdmin: decoded.isAdmin,
        userType: decoded.userType
      });
      
      logger.info('Token refresh successful', { userId: decoded.userId });
      
      res.json({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: 14400, // 4 hours in seconds
      });
      
    } catch (error) {
      logger.error('Token refresh failed', {
        error: error.message,
        name: error.name
      });
      res.status(401).json({ message: 'Invalid or expired refresh token' });
    }
  } catch (error) {
    logger.error('Refresh endpoint error', error);
    res.status(500).json({ message: 'Token refresh failed' });
  }
});

// Backwards compatibility: Legacy token refresh endpoint
router.post('/refresh-legacy', validate(refreshTokenValidation), async (req, res) => {
  try {
    const oldToken = req.headers.authorization?.split(' ')[1] || req.body.token;
    if (!oldToken) {
      return res.status(401).json({ message: 'No token provided' });
    }

    try {
      // Verify the old token with basic JWT (ignore expiration for refresh)
      const decoded = jwt.verify(oldToken, process.env.JWT_SECRET, { ignoreExpiration: true });
      
      // Generate new enhanced tokens
      const tokens = generateTokens({
        userId: decoded.userId,
        isAdmin: decoded.isAdmin,
        userType: decoded.userType
      });
      
      // Also provide legacy token for backwards compatibility
      const legacyToken = jwt.sign(
        { 
          userId: decoded.userId,
          isAdmin: decoded.isAdmin,
          userType: decoded.userType
        },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );
      
      logger.info('Legacy token refresh successful', { userId: decoded.userId });
      
      res.json({
        // New format
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: 14400,
        // Backwards compatibility
        token: legacyToken
      });
      
    } catch (error) {
      logger.error('Legacy token refresh failed', {
        error: error.message,
        name: error.name
      });
      res.status(401).json({ message: 'Invalid or expired token' });
    }
  } catch (error) {
    logger.error('Legacy refresh endpoint error', error);
    res.status(500).json({ message: 'Token refresh failed' });
  }
});

// Logout with token blacklisting
router.post('/logout', async (req, res) => {
  // Get user ID from token and blacklist tokens
  let userId = null;
  let userEmail = null;
  
  // Extract and blacklist access token
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const accessToken = authHeader.split(' ')[1];
    blacklistToken(accessToken);
    
    try {
      const decoded = validateToken(accessToken);
      userId = decoded.userId;
    } catch (error) {
      // Token already invalid, continue with logout
    }
  }
  
  // Extract and blacklist refresh token if provided
  const refreshToken = req.body.refreshToken;
  if (refreshToken) {
    blacklistToken(refreshToken);
  }
  
  // Log the logout action
  if (userId) {
    try {
      const user = await User.findById(userId);
      if (user) {
        userEmail = user.email;
        const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        await UserLog.create({
          userId,
          email: userEmail,
          action: 'logout',
          ipAddress,
          userAgent: req.headers['user-agent'],
          timestamp: new Date()
        });
      }
    } catch (error) {
      console.error('Error logging logout:', error);
    }
  }

  res.json({ message: 'Logout successful' });
});

// Get current user profile
router.get('/me', async (req, res) => {
  try {
    // Extract the token from the request headers
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authorization header required' });
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    const user = await User.findById(decoded.userId).select('-password').populate('roles');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ message: 'Error fetching user profile' });
  }
});

module.exports = router; 