import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  CircularProgress,
  FormControlLabel,
  Switch
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterMoment } from '@mui/x-date-pickers/AdapterMoment';
import moment from 'moment';
import api from '../../services/api';
import ExportMenu from '../common/ExportMenu';

const ApiUsageReport = () => {
  const [loading, setLoading] = useState(false);
  const [services, setServices] = useState([]);
  const [roles, setRoles] = useState([]);
  const [applications, setApplications] = useState([]);
  const [components, setComponents] = useState([]);
  const [selectedService, setSelectedService] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedApp, setSelectedApp] = useState('');
  const [selectedComponent, setSelectedComponent] = useState('');
  const [startDate, setStartDate] = useState(moment().subtract(7, 'days'));
  const [endDate, setEndDate] = useState(moment());
  const [usageData, setUsageData] = useState([]);
  const [error, setError] = useState('');
  const [showDetails, setShowDetails] = useState(false);
  const [sortField, setSortField] = useState('timestamp');
  const [sortDirection, setSortDirection] = useState('desc');

  const handleError = (err) => {
    if (err.response?.status === 401) {
      setError('Your session has expired. Please log in again.');
    } else {
      setError('Failed to fetch data');
      console.error('Error:', err);
    }
  };

  // Fetch initial data and handle cascading filters
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        // Build query params based on selections
        const params = {};
        if (selectedService) params.service = selectedService;

        // Fetch services (always)
        const servicesRes = await api.get('/api/services');
        setServices(servicesRes.data);

        // Fetch roles based on selected service
        const rolesRes = await api.get('/api/roles', { params });
        setRoles(rolesRes.data);

        // Fetch applications based on selected service and role
        if (selectedRole) params.role = selectedRole;
        const appsRes = await api.get('/api/applications', { params });
        setApplications(appsRes.data);

        // Fetch unique components based on current filters
        const componentsRes = await api.get('/api/reports/components', { params });
        setComponents(componentsRes.data);

      } catch (err) {
        handleError(err);
      }
    };

    fetchFilters();
  }, [selectedService, selectedRole]);

  const handleServiceChange = (event) => {
    const value = event.target.value;
    setSelectedService(value);
    setSelectedRole('');
    setSelectedApp('');
    setSelectedComponent('');
  };

  const handleRoleChange = (event) => {
    const value = event.target.value;
    setSelectedRole(value);
    setSelectedApp('');
    setSelectedComponent('');
  };

  const handleSearch = async () => {
    if (!startDate || !endDate) {
      setError('Please select both start and end dates');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const params = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        showDetails: showDetails ? 'true' : 'false'
      };

      if (selectedService) params.service = selectedService;
      if (selectedRole) params.role = selectedRole;
      if (selectedApp) params.application = selectedApp;
      if (selectedComponent) params.component = selectedComponent;

      const response = await api.get('/api/reports/api-usage', { params });
      setUsageData(response.data);
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedService('');
    setSelectedRole('');
    setSelectedApp('');
    setSelectedComponent('');
    setStartDate(moment().subtract(7, 'days'));
    setEndDate(moment());
    setUsageData([]);
    setError('');
  };

  const handleSort = (field) => {
    const isAsc = sortField === field && sortDirection === 'asc';
    setSortDirection(isAsc ? 'desc' : 'asc');
    setSortField(field);
  };

  const sortData = (data) => {
    return data.sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];

      if (sortField === 'timestamp') {
        return sortDirection === 'asc' 
          ? new Date(aValue) - new Date(bValue)
          : new Date(bValue) - new Date(aValue);
      }

      if (typeof aValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }

      return sortDirection === 'asc'
        ? String(aValue).localeCompare(String(bValue))
        : String(bValue).localeCompare(String(aValue));
    });
  };

  const handleShowDetailsChange = async (e) => {
    const newValue = e.target.checked;
    setShowDetails(newValue);
    
    if (usageData.length > 0) {
      setLoading(true);
      try {
        const params = {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          showDetails: newValue ? 'true' : 'false',
          service: selectedService || undefined,
          role: selectedRole || undefined,
          application: selectedApp || undefined,
          component: selectedComponent || undefined
        };

        const response = await api.get('/api/reports/api-usage', { params });
        setUsageData(response.data);
      } catch (err) {
        handleError(err);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <Box p={3}>
      <Typography variant="h5" gutterBottom>
        API Usage Report
      </Typography>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Box display="flex" flexDirection="column" gap={2}>
          {/* First row with filters */}
          <Box display="flex" gap={2} flexWrap="wrap">
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>Service</InputLabel>
              <Select
                value={selectedService}
                onChange={handleServiceChange}
                label="Service"
              >
                <MenuItem value="">All Services</MenuItem>
                {services.map((service) => (
                  <MenuItem key={service._id} value={service._id}>
                    {service.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>Role</InputLabel>
              <Select
                value={selectedRole}
                onChange={handleRoleChange}
                label="Role"
              >
                <MenuItem value="">All Roles</MenuItem>
                {roles.map((role) => (
                  <MenuItem key={role._id} value={role._id}>
                    {role.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>Application</InputLabel>
              <Select
                value={selectedApp}
                onChange={(e) => setSelectedApp(e.target.value)}
                label="Application"
              >
                <MenuItem value="">All Applications</MenuItem>
                {applications.map((app) => (
                  <MenuItem key={app._id} value={app._id}>
                    {app.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>Component</InputLabel>
              <Select
                value={selectedComponent}
                onChange={(e) => setSelectedComponent(e.target.value)}
                label="Component"
              >
                <MenuItem value="">All Components</MenuItem>
                {components.map((component) => (
                  <MenuItem key={component} value={component}>
                    {component}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {/* Second row with date pickers and buttons */}
          <Box display="flex" gap={2} flexWrap="wrap" alignItems="center">
            <LocalizationProvider dateAdapter={AdapterMoment}>
              <DatePicker
                label="Start Date"
                value={startDate}
                onChange={setStartDate}
                slotProps={{ textField: { sx: { width: 200 } } }}
              />
              <DatePicker
                label="End Date"
                value={endDate}
                onChange={setEndDate}
                slotProps={{ textField: { sx: { width: 200 } } }}
              />
            </LocalizationProvider>

            <Box display="flex" gap={1} alignItems="center">
              <FormControlLabel
                control={
                  <Switch
                    checked={showDetails}
                    onChange={handleShowDetailsChange}
                  />
                }
                label="Show Details"
              />

              <Button
                variant="contained"
                onClick={handleSearch}
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} /> : 'Search'}
              </Button>

              <Button
                variant="outlined"
                onClick={handleReset}
                disabled={loading}
              >
                Reset
              </Button>

              {usageData.length > 0 && (
                <ExportMenu
                  data={usageData}
                  filename="api_usage_report"
                />
              )}
            </Box>
          </Box>
        </Box>

        {error && (
          <Typography color="error" gutterBottom>
            {error}
          </Typography>
        )}

        {usageData.length > 0 && (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>
                    <TableSortLabel
                      active={sortField === 'serviceName'}
                      direction={sortField === 'serviceName' ? sortDirection : 'asc'}
                      onClick={() => handleSort('serviceName')}
                    >
                      Service
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={sortField === 'component'}
                      direction={sortField === 'component' ? sortDirection : 'asc'}
                      onClick={() => handleSort('component')}
                    >
                      Component
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={sortField === 'roleName'}
                      direction={sortField === 'roleName' ? sortDirection : 'asc'}
                      onClick={() => handleSort('roleName')}
                    >
                      Role
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={sortField === 'applicationName'}
                      direction={sortField === 'applicationName' ? sortDirection : 'asc'}
                      onClick={() => handleSort('applicationName')}
                    >
                      Application
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={sortField === 'method'}
                      direction={sortField === 'method' ? sortDirection : 'asc'}
                      onClick={() => handleSort('method')}
                    >
                      Method
                    </TableSortLabel>
                  </TableCell>
                  {showDetails ? (
                    <TableCell>
                      <TableSortLabel
                        active={sortField === 'timestamp'}
                        direction={sortField === 'timestamp' ? sortDirection : 'asc'}
                        onClick={() => handleSort('timestamp')}
                      >
                        Timestamp
                      </TableSortLabel>
                    </TableCell>
                  ) : (
                    <TableCell>
                      <TableSortLabel
                        active={sortField === 'count'}
                        direction={sortField === 'count' ? sortDirection : 'asc'}
                        onClick={() => handleSort('count')}
                      >
                        Count
                      </TableSortLabel>
                    </TableCell>
                  )}
                </TableRow>
              </TableHead>
              <TableBody>
                {sortData([...usageData]).map((row, index) => (
                  <TableRow key={index}>
                    <TableCell>{row.serviceName}</TableCell>
                    <TableCell>{row.component}</TableCell>
                    <TableCell>{row.roleName}</TableCell>
                    <TableCell>{row.applicationName}</TableCell>
                    <TableCell>{row.method}</TableCell>
                    {showDetails ? (
                      <TableCell>
                        {moment(row.timestamp).format('YYYY-MM-DD HH:mm:ss')}
                      </TableCell>
                    ) : (
                      <TableCell>{row.count}</TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  );
};

export default ApiUsageReport; 