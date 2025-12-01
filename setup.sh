#!/bin/bash

echo "🚀 Setting up Timetable Management System..."

# Setup server
echo "📦 Installing server dependencies..."
cd server
npm install
cd ..

# Setup client
echo "📦 Installing client dependencies..."
cd client
npm install
cd ..

echo "✅ Setup complete!"
echo ""
echo "To start the application:"
echo "1. Start the server: cd server && npm start"
echo "2. Start the client: cd client && npm run dev"
echo ""
echo "Default incharge password: admin123"
