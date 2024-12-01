import { Paper, Box, Typography } from '@mui/material';

const MetricCard = ({ title, value, icon, color = 'primary' }) => {
  return (
    <Paper
      sx={{
        p: 3,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          top: -10,
          right: -10,
          opacity: 0.1,
          transform: 'rotate(30deg)',
          '& > svg': {
            fontSize: 100,
            color: `${color}.main`
          }
        }}
      >
        {icon}
      </Box>
      <Typography variant="h6" color="textSecondary" gutterBottom>
        {title}
      </Typography>
      <Typography variant="h3" color={`${color}.main`}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </Typography>
    </Paper>
  );
};

export default MetricCard; 