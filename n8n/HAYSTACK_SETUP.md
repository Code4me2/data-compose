# Haystack/Elasticsearch Integration Setup

## Overview

This document provides the complete setup and configuration for the Haystack/Elasticsearch integration in the Data Compose project.

## Current Implementation

### Active Service
- **Service File**: `haystack_service_simple.py` (NOT the full Haystack library version)
- **Reason**: Direct Elasticsearch integration without Haystack library dependencies
- **Features**: Full document ingestion, search (BM25/Vector/Hybrid), hierarchy tracking, tree navigation

## Architecture

The Haystack integration works alongside the existing Data Compose infrastructure:

- **Main Services** (in parent directory): NGINX, n8n, PostgreSQL
- **Haystack Services** (added by this integration): Elasticsearch, Haystack API Service

## Files Structure

```
data_compose/                    # Root directory
├── docker-compose.yml          # Main services
├── n8n/
│   ├── docker-compose.haystack.yml  # Supplementary Haystack services
│   ├── haystack-service/
│   │   ├── Dockerfile
│   │   ├── haystack_service_simple.py  # Active implementation
│   │   ├── elasticsearch_setup.py
│   │   └── requirements-minimal.txt    # Active requirements
│   └── custom-nodes/
│       └── n8n-nodes-haystack/         # Custom n8n node
│           ├── nodes/
│           │   └── HaystackSearch/
│           │       ├── HaystackSearch.node.ts
│           │       └── haystack.svg
│           ├── package.json
│           └── dist/                   # Compiled node files
```

## Installation

1. **Build the n8n custom node**:
   ```bash
   cd n8n/custom-nodes/n8n-nodes-haystack
   npm install
   npm run build
   cd ../../..
   ```

2. **Start all services** (from the root `data_compose/` directory):
   ```bash
   # Option 1: Using the convenience script
   cd n8n && ./start_haystack_services.sh && cd ..
   
   # Option 2: Using docker-compose directly
   docker-compose -f docker-compose.yml -f n8n/docker-compose.haystack.yml up -d
   ```

   The script will:
   - Start the main Data Compose services if not running
   - Add Elasticsearch and Haystack services
   - Set up the Elasticsearch index
   - Verify all services are healthy

## Service Endpoints

The Haystack service provides 10 endpoints:

1. `GET /health` - Service health check
2. `POST /ingest` - Store documents with hierarchy metadata
3. `POST /search` - Search using hybrid/vector/BM25 methods
4. `POST /hierarchy` - Get document relationships
5. `POST /get_by_stage` - Retrieve documents by workflow stage
6. `POST /update_status` - Update document processing status
7. `POST /batch_hierarchy` - Get hierarchy for multiple documents
8. `GET /get_final_summary/{workflow_id}` - Get final summary document
9. `GET /get_complete_tree/{workflow_id}` - Get complete hierarchical tree
10. `GET /get_document_with_context/{document_id}` - Get document with navigation context

## Using the n8n Node

The custom Haystack node provides 10 operations:

1. **Ingest Documents** - Batch document ingestion with hierarchy
2. **Search** - Hybrid/vector/BM25 search capabilities
3. **Get Hierarchy** - Retrieve document relationships
4. **Health Check** - Verify service status
5. **Get By Stage** - Get documents by processing stage
6. **Update Status** - Update document processing status
7. **Batch Hierarchy** - Get hierarchy for multiple documents
8. **Get Final Summary** - Retrieve workflow final summary
9. **Get Complete Tree** - Get full hierarchical structure
10. **Get Document with Context** - Get document with navigation

## Docker Commands

```bash
# View logs (from root directory)
docker-compose -f docker-compose.yml -f n8n/docker-compose.haystack.yml logs -f haystack-service

# Stop services
docker-compose -f docker-compose.yml -f n8n/docker-compose.haystack.yml down

# Remove volumes (careful - this deletes data)
docker-compose -f docker-compose.yml -f n8n/docker-compose.haystack.yml down -v
```

## Service URLs

- **n8n UI**: http://localhost:8080/n8n/
- **Haystack API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **Elasticsearch**: http://localhost:9200

## Testing

After services are running, test the integration:

```bash
cd haystack-service
python test_integration.py
```

## Network Architecture

The Haystack services connect to the existing networks defined as external:
- `data_compose_backend`: Allows n8n to communicate with Haystack API and Elasticsearch
- `data_compose_frontend`: Defined but not used by Haystack services
- All services work together seamlessly through the shared backend network

## Troubleshooting

If services don't start:

1. Check Docker is running
2. Ensure ports 8000 and 9200 are free
3. Verify the main services are healthy first
4. Check logs: `docker-compose logs haystack-service`

## Development

To modify the Haystack node:
1. Edit files in `custom-nodes/n8n-nodes-haystack/`
2. Run `npm run build`
3. Restart n8n container: `docker-compose restart n8n`