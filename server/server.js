require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const connectDB = require('./config/database');
const { authMiddleware } = require('./middleware/auth');
const apiKeyAuth = require('./middleware/apiKeyAuth');
const { apiLimiter, authLimiter } = require('./middleware/rateLimiter');
const sql = require('mssql');
const { decryptDatabasePassword } = require('./utils/encryption');
const servicesRouter = require('./routes/services');
const documentationRouter = require('./routes/documentation');
const cookieParser = require('cookie-parser');
const persistentAuthMiddleware = require('./middleware/persistentAuth');

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Connect to MongoDB
connectDB().then(() => {
  console.log('Database connection established');
}).catch(err => {
  console.error('Database connection failed:', err);
  process.exit(1);
});

// Rate limiting
app.use('/api/auth', authLimiter);
app.use('/api', apiLimiter);

// Auth routes
app.use('/api/auth', require('./routes/auth'));

// Public API routes (no JWT, requires API key)
app.use('/api/public', apiKeyAuth, require('./routes/publicApi'));

// Protected admin routes (requires JWT)
app.use('/api/services', persistentAuthMiddleware, servicesRouter);
app.use('/api/roles', persistentAuthMiddleware, require('./routes/roles'));
app.use('/api/applications', persistentAuthMiddleware, require('./routes/applications'));
app.use('/api/reports', persistentAuthMiddleware, require('./routes/reports'));
app.use('/api/users', persistentAuthMiddleware, require('./routes/users'));
app.use('/api/dashboard', persistentAuthMiddleware, require('./routes/dashboard'));
app.use('/api/documentation', persistentAuthMiddleware, documentationRouter);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`)); 