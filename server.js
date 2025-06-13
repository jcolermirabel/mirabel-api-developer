const { logger } = require('./middleware/logger');
const { consolidatedApiKeyMiddleware } = require('./middleware/consolidatedAuthMiddleware');

// Debug environment variables
console.log('Environment:', {
  app.use(express.json());
  app.use(cookieParser());

  // Connect to MongoDB
  await connectDB();
  console.log('MongoDB connected successfully');

  // Public routes (no auth required)
  app.use('/api/auth', require('./routes/auth'));

  // JWT protected routes (require login)
  app.use('/api/users', persistentAuth, require('./routes/users'));
  app.use('/api/roles', persistentAuth, require('./routes/roles'));
}); 