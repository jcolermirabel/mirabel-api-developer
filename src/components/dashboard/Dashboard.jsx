import { useState, useEffect } from 'react';
import { Grid, Paper, Box, Typography } from '@mui/material';
import MetricCard from './MetricCard';
import ActivityChart from './ActivityChart';
import { getDashboardMetrics } from '../../services/dashboardService';
import LoadingSpinner from '../common/LoadingSpinner';

const Dashboard = () => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const data = await getDashboardMetrics();
        if (data.activityData) {
          data.activityData = data.activityData.map(item => ({
            ...item,
            timestamp: new Date(new Date(item.timestamp).toLocaleString('en-US', {
              timeZone: 'America/New_York'
            }))
          }));
        }
        setMetrics(data);
      } catch (error) {
        console.error('Failed to fetch dashboard metrics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>Dashboard</Typography>
      
      <Grid container spacing={3}>
        {/* Metric Cards */}
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Services"
            value={metrics?.services || 0}
            icon="services"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Applications"
            value={metrics?.applications || 0}
            icon="apps"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Roles"
            value={metrics?.roles || 0}
            icon="roles"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="API Calls Today"
            value={metrics?.apiCalls || 0}
            icon="api"
          />
        </Grid>

        {/* Activity Chart - now full width */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" sx={{ mb: 2 }}>API Activity</Typography>
            <ActivityChart data={metrics?.activityData || []} />
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard; 