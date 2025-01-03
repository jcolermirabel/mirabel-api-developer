const API_URL = process.env.REACT_APP_API_URL;

export const getRoleEndpoints = async (roleId) => {
  try {
    console.log('Starting documentation fetch for role:', roleId);
    
    const response = await fetch(
      `${API_URL}/api/documentation/role/${roleId}`,
      { 
        headers: {
          'Authorization': `Bearer ${JSON.parse(localStorage.getItem('user')).token}`,
          'x-mirabel-api-key': process.env.REACT_APP_API_KEY
        }
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body.getReader();
    const endpoints = [];
    let isDone = false;

    while (!isDone) {
      const { done, value } = await reader.read();
      
      if (done) {
        console.log('Documentation stream complete:', {
          endpointCount: endpoints.length
        });
        isDone = true;
        break;
      }

      // Convert the chunk to text
      const chunk = new TextDecoder().decode(value);
      const lines = chunk.split('\n').filter(Boolean);

      // Process each line
      for (const line of lines) {
        try {
          const data = JSON.parse(line);
          if (data.endpoint) {
            endpoints.push(data.endpoint);
            console.log('Received endpoint:', {
              service: data.endpoint.service,
              object: data.endpoint.objectName
            });
          }
        } catch (e) {
          console.warn('Failed to parse chunk:', e);
        }
      }
    }

    return { endpoints };
  } catch (error) {
    console.error('Documentation service error:', {
      message: error.message,
      status: error.status
    });
    throw new Error(error.message || 'Failed to fetch role endpoints');
  }
}; 