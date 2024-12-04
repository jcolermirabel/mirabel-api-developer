module.exports = {
  apps: [{
    name: 'mirabel-api',
    script: 'server.js',
    cwd: '/home/ubuntu/mirabel-api/server',
    env_production: {
      NODE_ENV: 'production'
    },
    env_file: '.env.production'
  }]
} 