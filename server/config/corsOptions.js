const corsOptions = {
  origin: process.env.CORS_ORIGIN,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Mirabel-API'],
  exposedHeaders: ['X-Total-Count'],
  credentials: true,
  maxAge: 600 // 10 minutes
};

module.exports = corsOptions; 