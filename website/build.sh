#!/bin/bash
# Build script for Data Compose website

echo "Building Data Compose website..."

# Check if we're in development or production mode
if [ "$1" == "dev" ]; then
    echo "Development mode: Using TypeScript setup"
    cp index.development.html index.html
    npm run dev
else
    echo "Production mode: Using vanilla JS/CSS"
    cp index.production.html index.html
    echo "Ready to serve with Docker on port 8080"
fi