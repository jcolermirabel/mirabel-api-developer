/**
 * Mirabel Connect API Authentication Proxy
 * 
 * This script provides a simple proxy to authenticate with the Mirabel Connect API.
 * It can be called directly from other Node.js code.
 */

const http = require('http');
const https = require('https');
require('dotenv').config();

/**
 * Authenticate a user against the Mirabel Connect API
 * 
 * @param {string} username - The username to authenticate
 * @param {string} password - The password to authenticate
 * @returns {Promise<Object>} - The authentication result
 */
async function authenticateUser(username, password) {
  // Get API key from environment variables
  const apiKey = process.env.MIRABEL_API_KEY || process.env.REACT_APP_API_KEY;
  
  if (!apiKey) {
    return Promise.reject(new Error('API key not found in environment variables. Please set MIRABEL_API_KEY in .env file.'));
  }
  
  // Build the API URL
  const apiUrl = new URL(process.env.MIRABEL_CONNECT_API_URL || 'http://localhost:3001/api/v2/mm/_proc/uspUserAuthenticationGetMirabelConnect');
  apiUrl.searchParams.append('pUserName', username);
  apiUrl.searchParams.append('pPassword', password);
  
  console.log('API Route accessed:', {
    method: 'GET',
    path: apiUrl.pathname,
    params: {},
    query: {
      pUserName: username,
      pPassword: '[REDACTED]' // Security: Always mask passwords completely
    },
    body: {}
  });
  
  // Set up options for the request
  const options = {
    hostname: apiUrl.hostname,
    port: apiUrl.port,
    path: `${apiUrl.pathname}${apiUrl.search}`,
    method: 'GET',
    headers: {
      'x-mirabel-api-key': apiKey,
      'x-dreamfactory-api-key': apiKey
    }
  };
  
  // Return a promise that resolves when the API call completes
  return new Promise((resolve, reject) => {
    // Choose http or https based on URL
    const client = apiUrl.protocol === 'https:' ? https : http;
    
    const req = client.request(options, (res) => {
      let data = '';
      
      // Collect response data
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      // Process the complete response
      res.on('end', () => {
        console.log(`API response status: ${res.statusCode}`);
        
        try {
          // Parse the JSON response
          const responseData = data ? JSON.parse(data) : {};
          console.log('API response data:', JSON.stringify(responseData, null, 2));
          
          // Check for access denied error messages in the response
          if (responseData.ErrorMessage === 'Access denied' || 
              (responseData.value && responseData.value[0] && responseData.value[0].ErrorMessage === 'Access denied')) {
            console.log('API returned "Access denied" error message');
            resolve({
              success: false,
              message: 'Authentication failed: Access denied'
            });
            return;
          }
          
          if (res.statusCode === 200) {
            // The API call was successful - check if we have a valid user response
            let userArray = null;
            
            // Handle different response formats
            if (Array.isArray(responseData)) {
              // Direct array response
              userArray = responseData;
              console.log('API returned a direct array');
            } else if (responseData && responseData.value && Array.isArray(responseData.value)) {
              // Object with value property containing array
              userArray = responseData.value;
              console.log('API returned an object with value array');
            }
            
            // Check if we have user data
            if (userArray && userArray.length > 0) {
              // Check for error messages in the user data
              if (userArray[0].ErrorMessage) {
                console.log(`API returned error message: ${userArray[0].ErrorMessage}`);
                resolve({
                  success: false,
                  message: `Authentication failed: ${userArray[0].ErrorMessage}`
                });
                return;
              }
              
              // Group databases by user to handle multiple database access
              const userData = userArray[0];
              const accessibleDatabases = userArray.map(entry => ({
                databaseName: entry.DatabaseName,
                serverName: entry.Servername,
                clientID: entry.ClientID
              }));
              
              // Add the databases to the user data
              userData.accessibleDatabases = accessibleDatabases;
              
              console.log('User data found:', {
                authenticated: true,
                // Show relevant properties for debugging
                properties: Object.keys(userData),
                databaseCount: accessibleDatabases.length
              });
              
              resolve({
                success: true,
                user: userData
              });
            } else {
              console.log('API returned empty result - invalid credentials');
              resolve({
                success: false,
                message: 'Authentication failed: Invalid email or password'
              });
            }
          } else {
            console.log(`API error (${res.statusCode}):`, responseData);
            reject(new Error(`API returned status code ${res.statusCode}: ${data}`));
          }
        } catch (error) {
          console.error('Error parsing API response:', error);
          console.log('Raw response data:', data);
          reject(new Error(`Failed to parse API response: ${error.message}`));
        }
      });
    });
    
    // Handle request errors
    req.on('error', (error) => {
      reject(new Error(`API request failed: ${error.message}`));
    });
    
    // Complete the request
    req.end();
  });
}

module.exports = {
  authenticateUser
};