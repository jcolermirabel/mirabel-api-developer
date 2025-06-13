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
    const { startDate, endDate, databasename, component, showDetails } = req.query;
    console.log('API Usage Report Request:', {
      startDate,
      endDate,
      databasename,
      component,
      showDetails
    });

    const match = {
      timestamp: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    };

    if (databasename) match.databasename = databasename;
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
            databasename: 1,
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
              databasename: '$databasename',
              component: '$component',
              method: '$method'
            },
            count: { $sum: 1 }
          }
        },
        {
          $project: {
            _id: 0,
            databasename: '$_id.databasename',
            component: '$_id.component',
            method: '$_id.method',
            count: 1
          }
        },
        {
          $sort: {
            databasename: 1,
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
    const { databasename } = req.query;
    
    const match = {};
    if (databasename) match.databasename = databasename;

    const components = await ApiUsage.distinct('component', match);
    res.json(components);
  } catch (error) {
    console.error('Error fetching components:', error);
    res.status(500).json({ message: 'Failed to fetch components' });
  }
});

// Get unique database names
router.get('/database-names', async (req, res) => {
  try {
    const databaseNames = await ApiUsage.distinct('databasename');
    res.json(databaseNames.filter(db => db)); // Filter out null/empty values
  } catch (error) {
    console.error('Error fetching database names:', error);
    res.status(500).json({ message: 'Failed to fetch database names' });
  }
});

module.exports = router; 