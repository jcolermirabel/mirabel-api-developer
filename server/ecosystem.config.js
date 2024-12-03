module.exports = {
  apps: [{
    name: 'mirabel-api',
    script: 'server.js',
    env: {
      NODE_ENV: 'production',
      MONGODB_URI: 'mongodb://localhost:27017/mirabel_db'
    },
    env_production: {
      NODE_ENV: 'production',
      MONGODB_URI: 'mongodb://localhost:27017/mirabel_db'
    }
  }]
} 