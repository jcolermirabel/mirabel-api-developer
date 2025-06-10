#!/bin/bash
# Deployment script for Mirabel API

# 1. Stop PM2 first
cd ~/mirabel-api
pm2 stop all
pm2 delete all

# 2. Backup logs before cleanup
mkdir -p ~/deployment-backups/$(date +%Y%m%d)
cp -r ./server/logs ~/deployment-backups/$(date +%Y%m%d)/logs 2>/dev/null || :

# 3. Pull latest changes from git
git reset --hard HEAD
git clean -fd
git fetch origin
git reset --hard origin/main

# 4. Clean install and rebuild
rm -rf node_modules/
rm -rf build/
npm install
cd server && npm install && cd ..

# 5. Create environment file if not exists
[ ! -f ./server/.env.production ] && cp ./server/.env ./server/.env.production 2>/dev/null || :

# 6. Build frontend
export REACT_APP_API_URL=https://mirabelconnect.mirabeltechnologies.com
npm run build

# 7. Apply any database migrations if needed
cd server && npm run db:init && cd ..

# 8. Start with PM2
pm2 start server/ecosystem.config.js

# 9. Check deployment status
sleep 5
pm2 status