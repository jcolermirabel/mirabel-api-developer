require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const connectDB = require('./config/database');
const { authMiddleware } = require('./middleware/auth');
const apiKeyAuth = require('./middleware/apiKeyAuth');
const servicesRouter = require('./routes/services');
const documentationRouter = require('./routes/documentation');
const cookieParser = require('cookie-parser');
const persistentAuth = require('./middleware/persistentAuth');

// Debug environment variables
console.log('Environment:', {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  MONGODB_URI: process.env.MONGODB_URI
});

const app = express();

// Trust proxy configuration
app.set('trust proxy', true);

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
app.use('/api/services', persistentAuth, servicesRouter);
app.use('/api/roles', persistentAuth, require('./routes/roles'));
app.use('/api/applications', persistentAuth, require('./routes/applications'));
app.use('/api/reports', persistentAuth, require('./routes/reports'));
app.use('/api/users', persistentAuth, require('./routes/users'));
app.use('/api/dashboard', persistentAuth, require('./routes/dashboard'));
app.use('/api/documentation', persistentAuth, documentationRouter);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`)); 