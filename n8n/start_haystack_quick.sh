#!/bin/bash

echo "🚀 Starting Haystack Services for Judicial Access (Quick Start)"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Navigate to parent directory where main docker-compose.yml is located
cd ..

# Check if main services are running
if ! docker-compose ps | grep -q "n8n.*Up"; then
    echo "⚠️  Main n8n services are not running. Starting them first..."
    docker-compose up -d
    sleep 10
fi

# Start Haystack services using both compose files
echo "📦 Starting Haystack and Elasticsearch services..."
docker-compose -f docker-compose.yml -f n8n/docker-compose.haystack.yml up -d elasticsearch haystack-service

# Wait for services to be ready
echo "⏳ Waiting for services to start (this may take a while for first run)..."
sleep 30

# Run setup script inside the haystack container instead
echo "🔧 Setting up Elasticsearch index..."
docker-compose -f docker-compose.yml -f n8n/docker-compose.haystack.yml exec -T haystack-service python elasticsearch_setup.py || echo "⚠️ Index setup will run when service is ready"

# Check service health
echo "🏥 Checking service health..."
echo "Elasticsearch:" 
curl -s http://localhost:9200/_cluster/health | python3 -m json.tool 2>/dev/null || echo "  ⚠️  Elasticsearch not ready yet"
echo -e "\nHaystack Service:"
curl -s http://localhost:8000/health | python3 -m json.tool 2>/dev/null || echo "  ⚠️  Haystack service not ready yet"

echo ""
echo "✅ Haystack services are starting!"
echo "🌐 n8n UI: http://localhost:8080/n8n/"
echo "🔍 Elasticsearch: http://localhost:9200"
echo "🤖 Haystack API: http://localhost:8000"
echo "📚 API docs: http://localhost:8000/docs"
echo ""
echo "💡 Services may still be initializing. Check logs with:"
echo "   docker-compose -f docker-compose.yml -f n8n/docker-compose.haystack.yml logs -f haystack-service"
echo ""
echo "💡 To stop all services: docker-compose -f docker-compose.yml -f n8n/docker-compose.haystack.yml down"