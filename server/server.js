require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const connectDB = require('./config/database');
const { authMiddleware } = require('./middleware/auth');
const apiKeyAuth = require('./middleware/apiKeyAuth');
const { apiLimiter, authLimiter } = require('./middleware/rateLimiter');
const servicesRouter = require('./routes/services');
const documentationRouter = require('./routes/documentation');
const cookieParser = require('cookie-parser');
const persistentAuthMiddleware = require('./middleware/persistentAuthMiddleware');

// Debug environment variables
console.log('Environment:', {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  MONGODB_URI: process.env.MONGODB_URI
});

const app = express();

// Trust proxy configuration - MUST be first!
app.set('trust proxy', true);
app.enable('trust proxy');

// Rate limiting configuration
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  skip: (req) => {
    // Log request details
    console.log('Rate limit check:', {
      ip: req.ip,
      ips: req.ips,
      headers: {
        'x-forwarded-for': req.headers['x-forwarded-for'],
        'x-real-ip': req.headers['x-real-ip']
      }
    });
    return false; // Don't actually skip
  }
});

// Apply rate limiting to all routes
app.use(limiter);

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: ['http://localhost:3000', 'https://staging-api.magazinemanager.biz'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'Cookie', 'X-Mirabel-API'],
  exposedHeaders: ['X-CSRF-Token']
}));

app.use(express.json());
app.use(cookieParser());

// Connect to MongoDB
connectDB().then(() => {
  console.log('MongoDB connected successfully');
}).catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/public', apiKeyAuth, require('./routes/publicApi'));
app.use('/api/services', persistentAuthMiddleware, servicesRouter);
app.use('/api/roles', persistentAuthMiddleware, require('./routes/roles'));
app.use('/api/applications', persistentAuthMiddleware, require('./routes/applications'));
app.use('/api/reports', persistentAuthMiddleware, require('./routes/reports'));
app.use('/api/users', persistentAuthMiddleware, require('./routes/users'));
app.use('/api/dashboard', persistentAuthMiddleware, require('./routes/dashboard'));
app.use('/api/documentation', persistentAuthMiddleware, documentationRouter);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`)); 