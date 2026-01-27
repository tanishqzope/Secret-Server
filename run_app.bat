@echo off
echo Starting Secret Communication Platform...

echo Starting Server...
start "Secret Server" cmd /k "cd server && npm start"

echo Starting Client...
start "Secret Client" cmd /k "cd client && npm run dev"

echo Done! Open the link shown in the Client window if it doesn't open automatically.
pause
