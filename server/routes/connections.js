const express = require('express');
const router = express.Router();
const Connection = require('../models/Connection');
const Service = require('../models/Service');
const sql = require('mssql');
const { encryptDatabasePassword, decryptDatabasePassword } = require('../utils/encryption');
const { logger } = require('../utils/logger');
const { authMiddleware } = require('../middleware/auth');

// router.use(authMiddleware); // This was causing all connection routes to fail authentication silently.

// GET all connections
router.get('/', authMiddleware, async (req, res) => {
  try {
    const connections = await Connection.find();
    res.json(connections);
  } catch (error) {
    logger.error('Error fetching connections:', error);
    res.status(500).json({ error: 'Failed to fetch connections' });
  }
});

// GET connection by ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const connection = await Connection.findById(req.params.id);
    if (!connection) {
      return res.status(404).json({ message: 'Connection not found' });
    }
    res.json(connection);
  } catch (error) {
    logger.error('Error fetching connection:', error);
    res.status(500).json({ error: 'Failed to fetch connection' });
  }
});

// GET databases for a connection
router.get('/:id/databases', authMiddleware, async (req, res) => {
  let pool;
  try {
    const connection = await Connection.findById(req.params.id).select('+password');
    if (!connection) {
      return res.status(404).json({ message: 'Connection not found' });
    }

    const decryptedPassword = decryptDatabasePassword(connection.password);

    const config = {
      user: connection.username,
      password: decryptedPassword,
      server: connection.host,
      port: connection.port,
      options: {
        encrypt: true,
        trustServerCertificate: true,
        connectTimeout: 15000
      }
    };

    pool = await sql.connect(config);
    const result = await pool.request().query('SELECT name FROM sys.databases WHERE state = 0 ORDER BY name');
    
    // Filter out system databases if desired, but for now, return all
    const databaseNames = result.recordset.map(record => record.name);
    
    res.json(databaseNames);

  } catch (error) {
    logger.error(`Error fetching databases for connection ${req.params.id}:`, error);
    res.status(500).json({ message: 'Failed to fetch databases', error: error.message });
  } finally {
    if (pool) {
      await pool.close();
    }
  }
});

// POST create new connection
router.post('/', authMiddleware, async (req, res) => {
  try {
    console.log('Connection creation request received:', {
      name: req.body.name,
      host: req.body.host,
      port: req.body.port,
      username: req.body.username,
      passwordLength: req.body.password ? req.body.password.length : 0
    });

    // Test connection first with unencrypted password
    const connection = new Connection(req.body);
    const testResult = await connection.testConnection();
    
    if (!testResult.success) {
      return res.status(400).json({ 
        message: 'Connection test failed', 
        error: testResult.error 
      });
    }

    // Save connection (password will be encrypted by pre-save middleware)
    connection.createdBy = req.user.userId;
    const savedConnection = await connection.save();
    
    res.status(201).json(savedConnection);
  } catch (error) {
    console.error('Error creating connection:', error);
    res.status(500).json({ 
      message: 'Failed to create connection: ' + error.message
    });
  }
});

// PUT update connection
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const connection = await Connection.findById(req.params.id);
    if (!connection) {
      return res.status(404).json({ message: 'Connection not found' });
    }

    // If password is being updated, test the connection first
    if (req.body.password) {
      const testConnection = new Connection({
        ...connection.toObject(),
        ...req.body
      });
      const testResult = await testConnection.testConnection();
      
      if (!testResult.success) {
        return res.status(400).json({ 
          message: 'Connection test failed', 
          error: testResult.error 
        });
      }
    }

    // Update connection
    Object.assign(connection, req.body);
    const updatedConnection = await connection.save();
    
    res.json(updatedConnection);
  } catch (error) {
    console.error('Error updating connection:', error);
    res.status(500).json({ 
      message: 'Failed to update connection: ' + error.message
    });
  }
});

// DELETE connection
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    // Check if any services depend on this connection
    const dependentServices = await Service.find({ connectionId: req.params.id });
    if (dependentServices.length > 0) {
      return res.status(400).json({ 
        message: `Cannot delete connection. ${dependentServices.length} service(s) depend on it.`,
        dependentServices: dependentServices.map(s => s.name)
      });
    }

    const connection = await Connection.findByIdAndDelete(req.params.id);
    if (!connection) {
      return res.status(404).json({ message: 'Connection not found' });
    }

    res.json({ message: 'Connection deleted successfully' });
  } catch (error) {
    console.error('Error deleting connection:', error);
    res.status(500).json({ 
      message: 'Failed to delete connection: ' + error.message
    });
  }
});

// POST test connection
router.post('/:id/test', authMiddleware, async (req, res) => {
  try {
    const connection = await Connection.findById(req.params.id);
    if (!connection) {
      return res.status(404).json({ message: 'Connection not found' });
    }

    const result = await connection.testConnection();
    res.json(result);
  } catch (error) {
    logger.error('Test connection error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST test connection (without saving)
router.post('/test', authMiddleware, async (req, res) => {
  try {
    const tempConnection = new Connection(req.body);
    const result = await tempConnection.testConnection();
    res.json(result);
  } catch (error) {
    logger.error('Test connection error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router; 