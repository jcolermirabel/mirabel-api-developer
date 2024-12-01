#!/bin/bash
echo "Starting Mirabel API Development Environment..."

# Check if node_modules exists in root and server directories
if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install
fi

if [ ! -d "server/node_modules" ]; then
    echo "Installing backend dependencies..."
    cd server
    npm install
    cd ..
fi

# Initialize the database if needed
echo "Initializing database..."
cd server
npm run db:init
cd ..

# Start both servers using concurrently
echo "Starting development servers..."
npm start 