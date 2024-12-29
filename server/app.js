const express = require('express');
const app = express();
const apiRoutes = require('./routes/api');
const servicesRouter = require('./routes/services');
const importsRouter = require('./routes/imports');

// Other middleware and configurations...

// Mount the API routes at /api
app.use('/api', apiRoutes);
app.use('/api/services', servicesRouter);
app.use('/api/imports', importsRouter);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

module.exports = app; 