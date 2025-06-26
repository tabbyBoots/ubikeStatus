#!/bin/bash

echo "🚀 Execute uBike Full-Stack App"
echo "================================================"

# Navigate to the frontend directory and execute the command
cd ../ubikeStatus/frontend || exit
npm run dev &

echo "✅ Executing Frontend Server."

# Navigate to the backend directory and execute the commands
cd ../ubikeStatus/backend || exit
dotnet build && dotnet watch run &

echo "✅ Executing Backend Server."


