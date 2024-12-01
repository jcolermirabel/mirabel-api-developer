const express = require('express');
const router = express.Router();
const ApiUsage = require('../models/ApiUsage');
const Service = require('../models/Service');
const Role = require('../models/Role');
const Application = require('../models/Application');
const { authMiddleware } = require('../middleware/auth');
const mongoose = require('mongoose');

// Apply auth middleware to all routes
router.use(authMiddleware);

// Get API usage data
router.get('/api-usage', async (req, res) => {
  try {
    const { startDate, endDate, service, role, application, component, showDetails } = req.query;
    console.log('API Usage Report Request:', {
      startDate,
      endDate,
      service,
      role,
      application,
      component,
      showDetails
    });

    const match = {
      timestamp: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    };

    if (service) match.service = new mongoose.Types.ObjectId(service);
    if (role) match.role = new mongoose.Types.ObjectId(role);
    if (application) match.application = new mongoose.Types.ObjectId(application);
    if (component) match.component = component;

    let pipeline = [];

    if (showDetails === 'true') {
      // Detailed view
      pipeline = [
        { $match: match },
        {
          $lookup: {
            from: 'services',
            localField: 'service',
            foreignField: '_id',
            as: 'serviceInfo'
          }
        },
        {
          $lookup: {
            from: 'roles',
            localField: 'role',
            foreignField: '_id',
            as: 'roleInfo'
          }
        },
        {
          $lookup: {
            from: 'applications',
            localField: 'application',
            foreignField: '_id',
            as: 'applicationInfo'
          }
        },
        {
          $project: {
            serviceName: { $arrayElemAt: ['$serviceInfo.name', 0] },
            roleName: { $arrayElemAt: ['$roleInfo.name', 0] },
            applicationName: { $arrayElemAt: ['$applicationInfo.name', 0] },
            component: 1,
            method: 1,
            timestamp: 1
          }
        },
        {
          $sort: {
            timestamp: -1
          }
        }
      ];
    } else {
      // Summary view
      pipeline = [
        { $match: match },
        {
          $lookup: {
            from: 'services',
            localField: 'service',
            foreignField: '_id',
            as: 'serviceInfo'
          }
        },
        {
          $lookup: {
            from: 'roles',
            localField: 'role',
            foreignField: '_id',
            as: 'roleInfo'
          }
        },
        {
          $lookup: {
            from: 'applications',
            localField: 'application',
            foreignField: '_id',
            as: 'applicationInfo'
          }
        },
        {
          $group: {
            _id: {
              service: '$service',
              component: '$component',
              role: '$role',
              application: '$application',
              method: '$method'
            },
            count: { $sum: 1 },
            serviceName: { $first: { $arrayElemAt: ['$serviceInfo.name', 0] } },
            roleName: { $first: { $arrayElemAt: ['$roleInfo.name', 0] } },
            applicationName: { $first: { $arrayElemAt: ['$applicationInfo.name', 0] } }
          }
        },
        {
          $project: {
            _id: 0,
            serviceName: 1,
            component: '$_id.component',
            roleName: 1,
            applicationName: 1,
            method: '$_id.method',
            count: 1
          }
        },
        {
          $sort: {
            serviceName: 1,
            component: 1,
            count: -1
          }
        }
      ];
    }

    const usageData = await ApiUsage.aggregate(pipeline);
    console.log('API Usage Report Response:', {
      recordCount: usageData.length,
      sampleRecord: usageData[0]
    });

    res.json(usageData);
  } catch (error) {
    console.error('Error fetching API usage:', error);
    res.status(500).json({ message: 'Failed to fetch API usage data' });
  }
});

// Get unique components
router.get('/components', async (req, res) => {
  try {
    const { service, role, application } = req.query;
    
    const match = {};
    if (service) match.service = new mongoose.Types.ObjectId(service);
    if (role) match.role = new mongoose.Types.ObjectId(role);
    if (application) match.application = new mongoose.Types.ObjectId(application);

    const components = await ApiUsage.distinct('component', match);
    res.json(components);
  } catch (error) {
    console.error('Error fetching components:', error);
    res.status(500).json({ message: 'Failed to fetch components' });
  }
});

module.exports = router; 