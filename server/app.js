const express = require('express');
const cors = require('cors');
const session = require('express-session');
const mongoose = require('mongoose');
const helmet = require('helmet');
const { apiLimiter, authLimiter } = require('./middleware/rateLimiter');
const { apiKeyMiddleware, authMiddleware } = require('./middleware/auth');
const { consolidatedApiKeyMiddleware } = require('./middleware/consolidatedAuthMiddleware');
const { logger } = require('./middleware/logger');
const rolesRouter = require('./routes/roles');
const servicesRouter = require('./routes/services');
const documentationRouter = require('./routes/documentation');

// Services to use new authentication
const SERVICES_USING_NEW_AUTH = ['salesdemo_staging'];

const app = express();

// Trust proxy configuration - must be first!
app.enable('trust proxy');
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
    path: '/'
  },
  name: 'sessionId'
}));

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS configuration
app.use(cors({
  origin: ['http://localhost:3000', 'https://staging-api.magazinemanager.biz'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'Cookie', 'X-Mirabel-API'],
  exposedHeaders: ['X-CSRF-Token']
}));

// Rate limiting
app.use('/api/auth', authLimiter);
app.use('/api', apiLimiter);

// Debug middleware - only in development
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log('\n=== Request ===');
    console.log('Method:', req.method);
    console.log('Path:', req.path);
    console.log('Origin:', req.headers.origin);
    console.log('Headers:', req.headers);
    console.log('Session:', req.session);
    next();
  });
}

// Database connection check middleware
const checkDbConnection = (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      message: 'Database connection unavailable',
      state: mongoose.connection.readyState
    });
  }
  next();
};

// Logging middleware for authentication comparison during transition
app.use(async (req, res, next) => {
  if (!req.path.startsWith('/api/services')) {
    return next();
  }

  try {
    const mockRes = {
      status: function(code) {
        this.statusCode = code;
        return this;
      },
      json: function(data) {
        this.data = data;
        return this;
      }
    };

    await consolidatedApiKeyMiddleware(req, mockRes, () => {});

    if (mockRes.data) {
      logger.info('Auth middleware comparison', {
        path: req.path,
        method: req.method,
        requestId: req.authContext?.requestId,
        oldMiddleware: 'will execute',
        newMiddleware: mockRes.statusCode,
        difference: mockRes.data
      });
    }
  } catch (error) {
    logger.error('New middleware error', {
      path: req.path,
      method: req.method,
      error: error.message,
      stack: error.stack
    });
  }
  next();
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/roles', rolesRouter);

// Public API routes
app.use('/api/public', apiKeyMiddleware, require('./routes/publicApi'));

// Test connection route (must come before other service routes)
app.use('/api/services/test', express.json(), servicesRouter);

// General services routes
app.use('/api/services', checkDbConnection, servicesRouter);

// Service-specific routes with graduated authentication
app.use('/api/services/:serviceName/:endpoint', checkDbConnection, async (req, res, next) => {
  const serviceName = req.params.serviceName;
  
  // Choose authentication middleware based on service
  if (SERVICES_USING_NEW_AUTH.includes(serviceName)) {
    return consolidatedApiKeyMiddleware(req, res, next);
  }
  
  // Fall back to existing middleware for other services
  return apiKeyMiddleware(req, res, next);
});

// Handling of service requests
app.use('/api/services/:serviceName/:endpoint', async (req, res, next) => {
  if (res.headersSent) {
    return;
  }
  console.log('Handling API request:', {
    serviceName: req.params.serviceName,
    endpoint: req.params.endpoint
  });
  next();
});

// Protected admin routes
app.use('/api/applications', authMiddleware, require('./routes/applications'));
app.use('/api/reports', authMiddleware, require('./routes/reports'));
app.use('/api/users', authMiddleware, require('./routes/users'));
app.use('/api/dashboard', authMiddleware, require('./routes/dashboard'));
app.use('/api/documentation', authMiddleware, documentationRouter);

// Error handling middleware
app.use((err, req, res, next) => {
  const errorDetails = {
    message: process.env.NODE_ENV === 'production' 
      ? 'Something went wrong!' 
      : err.message,
    error: process.env.NODE_ENV === 'development' ? err : undefined,
    requestId: req.authContext?.requestId
  };

  logger.error('Error Handler', {
    ...errorDetails,
    stack: err.stack,
    url: req.url,
    method: req.method,
    serviceName: req.params?.serviceName
  });

  res.status(500).json(errorDetails);
});

// Handle 404s
app.use((req, res) => {
  res.status(404).json({ 
    message: 'Not Found',
    path: req.path,
    method: req.method
  });
});

module.exports = app;