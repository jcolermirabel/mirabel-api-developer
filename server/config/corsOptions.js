const corsOptions = {
  origin: process.env.CORS_ORIGIN,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-mirabel-api-key'],
  exposedHeaders: ['X-Total-Count'],
  credentials: true,
  maxAge: 600 // 10 minutes
};

module.exports = corsOptions; 