require('dotenv').config();
const express = require('express');
const app = express();
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const { logger } = require('./middleware/logger');

// Debug environment variables
console.log('Environment:', {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  MONGODB_URI: process.env.MONGODB_URI
});

// Trust proxy configuration - MUST be first, before any middleware
app.enable('trust proxy');
app.set('trust proxy', 1);

// Now import and configure middleware
const helmet = require('helmet');
const connectDB = require('./config/database');
const cookieParser = require('cookie-parser');
const persistentAuth = require('./middleware/persistentAuth');

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: ['http://localhost:3000', 'https://staging-api.magazinemanager.biz'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'Cookie', 'x-mirabel-api-key'],
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

// Add detailed logging for MongoDB connection
mongoose.connection.on('connected', () => {
  console.log('MongoDB connection details:', {
    host: mongoose.connection.host,
    port: mongoose.connection.port,
    name: mongoose.connection.name
  });
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', {
    message: err.message,
    code: err.code,
    name: err.name
  });
});

// Public routes (no auth required)
app.use('/api/auth', require('./routes/auth'));

// JWT protected routes (require login)
app.use('/api/users', persistentAuth, require('./routes/users'));
app.use('/api/roles', persistentAuth, require('./routes/roles'));
app.use('/api/applications', persistentAuth, require('./routes/applications'));
app.use('/api/services', persistentAuth, require('./routes/services'));
app.use('/api/reports', persistentAuth, require('./routes/reports'));
app.use('/api/dashboard', persistentAuth, require('./routes/dashboard'));
app.use('/api/documentation', persistentAuth, require('./routes/documentation'));
app.use('/api/imports', persistentAuth, require('./routes/imports'));
app.use('/api/ai', persistentAuth, require('./routes/ai'));

// API key protected routes
app.use('/api', require('./routes/api'));

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build/index.html'));
  });
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
}); 