@echo off
echo ===== Mirabel API Development Environment =====

echo Stopping any existing Node.js processes...
taskkill /F /IM node.exe >nul 2>&1

echo Killing processes on ports 3000 and 3001...
:: Find and kill process on port 3000
FOR /F "tokens=5" %%P IN ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') DO (
    echo Killing process with PID %%P on port 3000
    taskkill /F /PID %%P >nul 2>&1
)

:: Find and kill process on port 3001
FOR /F "tokens=5" %%P IN ('netstat -ano ^| findstr :3001 ^| findstr LISTENING') DO (
    echo Killing process with PID %%P on port 3001
    taskkill /F /PID %%P >nul 2>&1
)

echo Creating environment files...
:: Create React app port configuration
echo PORT=3000> .env.development
echo REACT_APP_API_URL=http://localhost:3001>> .env.development

:: Create server port configuration
cd server
echo NODE_ENV=development> .env.new
echo PORT=3001>> .env.new
type .env | findstr /v "NODE_ENV" | findstr /v "PORT">> .env.new
move /Y .env.new .env >nul 2>&1
cd ..

echo Starting development servers...

:: Start backend server in a new window (port 3001)
start "Mirabel API Backend Server" cmd /k "cd server && echo Starting backend server on port 3001... && npm run dev"

:: Give backend time to start
timeout /t 3 /nobreak

:: Start frontend server in a new window (port 3000)
start "Mirabel API Frontend" cmd /k "echo Starting frontend server on port 3000... && SET PORT=3000 && npm run start:frontend"

echo Development servers starting:
echo Backend API: http://localhost:3001
echo Frontend: http://localhost:3000
echo.
echo Use these URLs in your browser to access the application.
echo ========================================================= 