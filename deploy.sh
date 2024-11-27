#!/bin/bash

# Production deployment script for AllStars Wiki
echo "Starting deployment process..."

# Install dependencies
echo "Installing dependencies..."
npm install --production

# Create necessary directories
mkdir -p logs
mkdir -p data

# Move JSON data files to data directory
mv articles.json data/ 2>/dev/null || true
mv article_history.json data/ 2>/dev/null || true

# Set up PM2 process manager
echo "Setting up PM2..."
npm install pm2 -g

# Start the application with PM2
echo "Starting application with PM2..."
pm2 start server.prod.js --name "allstars-wiki" \
    --log "./logs/app.log" \
    --error "./logs/error.log" \
    --time \
    --watch \
    --env production

# Save PM2 process list
pm2 save

# Set up PM2 to start on system boot
pm2 startup

echo "Deployment complete!"
echo "You can monitor the application using: pm2 monit"
echo "View logs using: pm2 logs allstars-wiki"
