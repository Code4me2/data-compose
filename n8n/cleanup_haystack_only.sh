#!/bin/bash

echo "🧹 Cleaning up ONLY Haystack-related containers..."

# Navigate to parent directory
cd ..

# Stop and remove ONLY Haystack-related containers
echo "Stopping Haystack and Elasticsearch containers..."
docker-compose -f docker-compose.yml -f n8n/docker-compose.haystack.yml stop elasticsearch haystack-service
docker-compose -f docker-compose.yml -f n8n/docker-compose.haystack.yml rm -f elasticsearch haystack-service

# Remove the haystack image to force rebuild
echo "Removing Haystack image for fresh rebuild..."
docker rmi haystack-judicial 2>/dev/null || true

# The main n8n service remains running!
echo "✅ Haystack cleanup complete. n8n remains running."
echo ""
echo "Your n8n workflows and data are safe!"
echo "Now run: ./start_haystack_quick.sh"