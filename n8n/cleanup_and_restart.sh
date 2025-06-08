#!/bin/bash

echo "🧹 Cleaning up existing containers and volumes..."

# Navigate to parent directory
cd ..

# Stop and remove containers
docker-compose -f docker-compose.yml -f n8n/docker-compose.haystack.yml down

# Remove the haystack image to force rebuild
docker rmi haystack-judicial 2>/dev/null || true

echo "✅ Cleanup complete. Ready to start fresh."
echo ""
echo "Now run: ./start_haystack_quick.sh"