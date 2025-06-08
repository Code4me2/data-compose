# Haystack Service

This directory contains the Elasticsearch-based document processing service for the Data Compose project.

## Current Implementation

**Active Service**: `haystack_service_simple.py`

This is a simplified implementation that provides all necessary features using direct Elasticsearch client instead of the full Haystack library.

## Files

- `haystack_service_simple.py` - Main API service (currently active)
- `haystack_service.py` - Full Haystack implementation (not currently used due to dependency issues)
- `elasticsearch_setup.py` - Creates and configures the Elasticsearch index
- `test_integration.py` - Integration tests for the service
- `requirements-minimal.txt` - Python dependencies for the simple implementation
- `requirements.txt` - Full dependencies (includes problematic elasticsearch-haystack)
- `requirements-setup.txt` - Dependencies just for index setup
- `Dockerfile` - Container configuration

## Features

1. **Document Ingestion**
   - Batch processing
   - Automatic embedding generation
   - Hierarchy tracking (parent-child relationships)

2. **Search Capabilities**
   - BM25 (keyword) search
   - Vector (semantic) search
   - Hybrid search (combines both)

3. **Document Hierarchy**
   - Track document relationships
   - Support for recursive summarization workflows
   - Maintain provenance from summaries to sources

## API Endpoints

- `GET /health` - Service health check
- `POST /ingest` - Ingest documents
- `POST /search` - Search documents
- `POST /hierarchy` - Get document relationships
- `GET /docs` - Interactive API documentation

## Quick Start

```bash
# Build and run with Docker Compose (from project root)
docker-compose -f docker-compose.yml -f n8n/docker-compose.haystack.yml up -d

# Check service health
curl http://localhost:8000/health

# View API documentation
open http://localhost:8000/docs
```

## Testing

```bash
# Run integration tests (requires requests library)
python3 test_integration.py

# Or use curl for manual testing
curl -X POST http://localhost:8000/ingest \
  -H "Content-Type: application/json" \
  -d '[{"content": "Test document", "metadata": {"source": "test.pdf"}, "document_type": "source_document", "hierarchy_level": 0}]'
```

## Technical Details

- **Embedding Model**: BAAI/bge-small-en-v1.5 (384 dimensions)
- **Elasticsearch Index**: `judicial_documents`
- **Vector Similarity**: Cosine similarity with HNSW index
- **BM25 Analyzer**: Custom English analyzer for legal documents

## Why Two Implementations?

1. **haystack_service_simple.py** (Active)
   - Direct Elasticsearch client
   - No Haystack library dependencies
   - Simpler, more reliable
   - All features implemented

2. **haystack_service.py** (Inactive)
   - Full Haystack 2.x integration
   - Requires problematic `elasticsearch-haystack` package
   - More complex pipeline approach
   - Currently has installation issues

The simple implementation provides all needed functionality without the complexity and dependency issues of the full Haystack library.