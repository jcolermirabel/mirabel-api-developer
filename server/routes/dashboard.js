const express = require('express');
const router = express.Router();
const Service = require('../models/Service');
const User = require('../models/User');
const Role = require('../models/Role');
const Application = require('../models/Application');
const ApiUsage = require('../models/ApiUsage');

router.get('/metrics', async (req, res) => {
  try {
    // Get counts
    const [services, users, roles, applications] = await Promise.all([
      Service.countDocuments({ isActive: true }),
      User.countDocuments({ isActive: true }),
      Role.countDocuments(),
      Application.countDocuments({ isActive: true })
    ]);

    // Get today's API calls count
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const apiCallsToday = await ApiUsage.countDocuments({
      timestamp: { $gte: today }
    });

    // Get API activity data for the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const apiActivity = await ApiUsage.aggregate([
      {
        $match: {
          timestamp: { $gte: sevenDaysAgo }
        }
      },
      {
        $addFields: {
          estTimestamp: {
            $subtract: ['$timestamp', 5 * 60 * 60 * 1000]
          }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$estTimestamp' },
            month: { $month: '$estTimestamp' },
            day: { $dayOfMonth: '$estTimestamp' }
          },
          calls: { $sum: 1 }
        }
      },
      {
        $sort: { 
          '_id.year': 1,
          '_id.month': 1,
          '_id.day': 1
        }
      }
    ]);

    // Format activity data for the chart
    const activityData = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - (6 - i));
      
      const dataPoint = apiActivity.find(d => 
        d._id.year === date.getFullYear() &&
        d._id.month === date.getMonth() + 1 &&
        d._id.day === date.getDate()
      );

      return {
        time: date.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric',
          timeZone: 'America/New_York'
        }),
        calls: dataPoint ? dataPoint.calls : 0
      };
    });

    res.json({
      services,
      activeUsers: users,
      roles,
      applications,
      apiCalls: apiCallsToday,
      activityData
    });

  } catch (error) {
    console.error('Error fetching dashboard metrics:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard metrics' });
  }
});

module.exports = router; 