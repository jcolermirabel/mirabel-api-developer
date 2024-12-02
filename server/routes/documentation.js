const express = require('express');
const router = express.Router();
const Role = require('../models/Role');
const { decryptDatabasePassword } = require('../utils/encryption');
const { logger } = require('../middleware/logger');
const { fetchSchemaFromDatabase } = require('../utils/schemaUtils');

// Get documentation using stored schema
router.get('/role/:roleId', async (req, res) => {
  try {
    const role = await Role.findById(req.params.roleId)
      .populate('permissions.service')
      .lean();

    if (!role) {
      return res.status(404).json({ message: 'Role not found' });
    }

    // Transform all permissions into endpoints
    const endpoints = role.permissions
      .filter(p => p.service) // Only filter out ones without service
      .map(perm => {
        // Get the allowed methods
        const allowedMethods = Object.entries(perm.actions || {})
          .filter(([_, allowed]) => allowed)
          .map(([method]) => method);

        return {
          path: `/api/services/${perm.service.name}/${perm.objectName}`,
          method: allowedMethods[0] || 'GET',
          service: perm.service.name,
          description: `Execute ${perm.objectName} stored procedure`,
          parameters: perm.schema?.parameters?.map((param, index) => ({
            name: param.name || `param${index}`,
            type: param.type || 'unknown',
            parameterId: param.parameterId || index,
            isOutput: !!param.isOutput,
            isNullable: !!param.isNullable,
            maxLength: param.maxLength,
            precision: param.precision,
            scale: param.scale
          })) || [],
          procedureInfo: perm.schema?.procedure || null,
          metadata: perm.schema ? {
            schema: perm.schema.procedure?.schema,
            created: perm.schema.procedure?.created,
            modified: perm.schema.procedure?.modified,
            schemaLastUpdated: perm.schema.lastUpdated
          } : null,
          roleId: role._id,
          permissionId: perm._id
        };
      });

    res.json({ endpoints });

  } catch (error) {
    logger.error('Documentation retrieval error', { 
      error: error.message, 
      stack: error.stack 
    });
    res.status(500).json({ message: 'Failed to retrieve documentation' });
  }
});

// Refresh schema for a specific permission
router.post('/refresh-schema/:roleId/:permissionId', async (req, res) => {
  try {
    const role = await Role.findById(req.params.roleId)
      .populate('permissions.service');
    
    if (!role) {
      return res.status(404).json({ message: 'Role not found' });
    }

    const permission = role.permissions.id(req.params.permissionId);
    if (!permission) {
      return res.status(404).json({ message: 'Permission not found' });
    }

    // Connect to database and get fresh schema
    const schema = await fetchSchemaFromDatabase(permission.service, permission.objectName);
    
    // Update stored schema
    permission.schema = {
      lastUpdated: new Date(),
      ...schema
    };

    await role.save();

    res.json({ 
      message: 'Schema refreshed successfully',
      schema: permission.schema 
    });

  } catch (error) {
    logger.error('Schema refresh error', error);
    res.status(500).json({ message: 'Failed to refresh schema' });
  }
});

// Refresh all schemas for a role
router.post('/refresh-schemas/:roleId', async (req, res) => {
  try {
    const role = await Role.findById(req.params.roleId)
      .populate('permissions.service');

    if (!role) {
      return res.status(404).json({ message: 'Role not found' });
    }

    logger.info('Starting bulk schema refresh', {
      roleId: req.params.roleId,
      permissionCount: role.permissions.length
    });

    const startTime = Date.now();
    await refreshSchemasByService(role.permissions);
    await role.save();

    logger.info('Bulk schema refresh completed', {
      roleId: req.params.roleId,
      duration: Date.now() - startTime
    });

    res.json({
      message: 'Schemas refreshed successfully',
      updatedAt: new Date(),
      count: role.permissions.length
    });

  } catch (error) {
    logger.error('Bulk schema refresh failed', {
      roleId: req.params.roleId,
      error: error.message
    });
    res.status(500).json({ message: 'Failed to refresh schemas' });
  }
});

async function refreshSchemasByService(permissions) {
  const serviceGroups = permissions.reduce((acc, perm) => {
    if (!perm.service) return acc;
    const key = `${perm.service._id}`;
    if (!acc[key]) {
      acc[key] = {
        service: perm.service,
        permissions: []
      };
    }
    acc[key].permissions.push(perm);
    return acc;
  }, {});

  for (const group of Object.values(serviceGroups)) {
    try {
      // Get decrypted password
      const decryptedPassword = decryptDatabasePassword(group.service.password);
      if (!decryptedPassword) {
        throw new Error('Failed to decrypt database password');
      }

      // Single connection per service
      const pool = await sql.connect({
        server: group.service.host,
        port: group.service.port,
        database: group.service.database,
        user: group.service.username,
        password: decryptedPassword,
        options: {
          encrypt: true,
          trustServerCertificate: true
        }
      });

      // Process all permissions for this service
      for (const perm of group.permissions) {
        try {
          const schema = await fetchSchemaFromDatabase(pool, perm.objectName);
          if (schema) {
            perm.schema = {
              lastUpdated: new Date(),
              ...schema
            };
          }
        } catch (error) {
          logger.error('Failed to refresh schema', {
            service: group.service.name,
            object: perm.objectName,
            error: error.message
          });
        }
      }

      await pool.close();
    } catch (error) {
      logger.error('Service connection error during bulk refresh', {
        service: group.service.name,
        error: error.message
      });
    }
  }
}

module.exports = router; 