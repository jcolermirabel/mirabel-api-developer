const mongoose = require('mongoose');
const Connection = require('../models/Connection');
require('dotenv').config({ path: __dirname + '/../.env' });

async function listConnections() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const connections = await Connection.find({ isActive: true });
    
    if (connections.length === 0) {
      console.log('No active connections found.');
      return;
    }

    console.log(`\nFound ${connections.length} active connection(s):\n`);
    
    connections.forEach((conn, index) => {
      console.log(`${index + 1}. Connection Name: "${conn.name}"`);
      console.log(`   Host: ${conn.host}:${conn.port}`);
      console.log(`   Username: ${conn.username}`);
      console.log(`   Created: ${conn.createdAt.toLocaleDateString()}`);
      console.log(`   ID: ${conn._id}`);
      console.log('');
    });

  } catch (error) {
    console.error('Error listing connections:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  listConnections()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Failed to list connections:', error.message);
      process.exit(1);
    });
}

module.exports = { listConnections }; 