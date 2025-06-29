@echo off
echo Starting Dhaka Alert Backend Server...
echo.

cd backend

echo Installing dependencies...
npm install

echo.
echo Starting server on port 3000...
echo.
echo Backend will be available at: http://localhost:3000
echo Homepage will be available at: http://localhost:3000/homepage.html
echo.
echo Press Ctrl+C to stop the server
echo.

npm start

pause 