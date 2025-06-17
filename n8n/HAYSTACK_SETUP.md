# Haystack/Elasticsearch Integration Setup

## Overview

This document provides the complete setup and configuration for the Haystack/Elasticsearch integration in the Data Compose project.

## Implementation Overview

The Haystack integration uses direct Elasticsearch integration for optimal performance, providing document import from PostgreSQL, advanced search capabilities (BM25/Vector/Hybrid), and hierarchical document navigation.

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
│   │   ├── haystack_service.py         # Main API implementation
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

## Important: Pipeline Architecture

**The Haystack node works WITH the HierarchicalSummarization node, not instead of it:**

```
1. HierarchicalSummarization → Creates summaries → PostgreSQL
2. PostgreSQL Query → Retrieves processed documents
3. Haystack Import → Indexes in Elasticsearch
4. Haystack Search → Provides search interface
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

The Haystack service provides the following endpoints:

1. **`GET /health`** - Service health check
   - Returns: Elasticsearch connection status, document count, embedding model status
   
2. **`POST /import_from_node`** - Import documents from PostgreSQL query results
   - Input: Document with content, summary, hierarchy info, and metadata
   - Returns: Import status with document ID
   
3. **`POST /search`** - Search using hybrid/vector/BM25 methods
   - Input: Query text, search type, filters
   - Returns: Matching documents with scores
   
4. **`POST /hierarchy`** - Get document relationships
   - Input: Document ID, depth options
   - Returns: Parent and child documents
   
5. **`POST /batch_hierarchy`** - Get hierarchy for multiple documents efficiently
   - Input: Array of document IDs
   - Returns: Hierarchy information for all documents in one request
   
6. **`GET /get_final_summary/{workflow_id}`** - Get final summary document
   - Returns: The top-level summary for a workflow with tree metadata
   
7. **`GET /get_complete_tree/{workflow_id}`** - Get complete hierarchical tree
   - Returns: Full tree structure with configurable depth and content inclusion
   
8. **`GET /get_document_with_context/{document_id}`** - Get document with navigation context
   - Returns: Document content with breadcrumb path and sibling information

## Using the n8n Node

The custom Haystack node provides 8 operations focused on search and retrieval:

1. **Import from Previous Node** - Import hierarchical documents from PostgreSQL
2. **Search** - Hybrid/vector/BM25 search capabilities
3. **Get Hierarchy** - Retrieve document relationships
4. **Health Check** - Verify service status
5. **Batch Hierarchy** - Get hierarchy for multiple documents
6. **Get Final Summary** - Retrieve workflow final summary
7. **Get Complete Tree** - Get full hierarchical structure
8. **Get Document with Context** - Get document with navigation

### Integration with Hierarchical Summarization

1. Use the Hierarchical Summarization node to process documents
2. Query the results with PostgreSQL node:
   ```sql
   SELECT * FROM hierarchical_documents WHERE batch_id = 'your-batch-id'
   ```
3. Import to Haystack with field mapping configuration
4. Search and navigate the imported hierarchy

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
# Test health endpoint
curl http://localhost:8000/health | jq

# For full integration testing:
cd haystack-service
python test_integration.py
```

## Troubleshooting

**Service won't start?**
```bash
# Check if ports are in use
lsof -i :8000  # Haystack service
lsof -i :9200  # Elasticsearch
```

**Can't find documents?**
- Make sure you imported them first (Import from Previous Node)
- Check the workflow_id matches your documents

**Need logs?**
```bash
docker-compose logs haystack-service -f
```

## Example Workflow

1. Process documents with Hierarchical Summarization node
2. Query PostgreSQL for documents to import
3. Use Haystack Import operation with field mapping
4. Search across summaries and navigate hierarchy

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