const path = require('path');
const envPath = process.env.NODE_ENV === 'production' 
  ? path.resolve(__dirname, '.env.production')
  : path.resolve(__dirname, '.env');

require('dotenv').config({ path: envPath });
console.log('Environment:', process.env.NODE_ENV);
const express = require('express');
const app = express();
const mongoose = require('mongoose');
const cors = require('cors');
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

// Add request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  console.log('Headers:', JSON.stringify(req.headers));
  next();
});

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: ['https://mirabelconnect.mirabeltechnologies.com', 'http://mirabelconnect.mirabeltechnologies.com', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization']
}));

// Add response logging middleware
app.use((req, res, next) => {
  const originalSend = res.send;
  res.send = function(body) {
    console.log(`[${new Date().toISOString()}] Response status: ${res.statusCode}`);
    return originalSend.call(this, body);
  };
  next();
});

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

// Add a catch-all route to log 404 errors
app.use('*', (req, res) => {
  console.log(`[404 ERROR] ${req.method} ${req.originalUrl}`);
  console.log('Headers:', JSON.stringify(req.headers));
  res.status(404).json({ message: 'Route not found' });
});

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