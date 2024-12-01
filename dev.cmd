@echo off
echo Starting development servers...

:: Start frontend server in a new window
start cmd /k "echo Starting frontend server... && npm run start:frontend"

:: Start backend server in a new window
start cmd /k "cd server && echo Starting backend server... && npm run dev"

echo Development servers started in separate windows. 