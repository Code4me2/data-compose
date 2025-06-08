# Haystack Integration for n8n - Complete Documentation

## Overview

The Haystack integration provides a powerful document processing system within n8n, enabling hierarchical document analysis, recursive summarization, and advanced search capabilities. This integration is specifically optimized for legal document processing with a 4-level hierarchy system.

## Architecture Components

### 1. **n8n Custom Node** (`custom-nodes/n8n-nodes-haystack/`)

#### Core Files:

##### `nodes/HaystackSearch/HaystackSearch.node.ts`
**Purpose**: Main n8n node implementation providing the interface between n8n workflows and the Haystack service.

**Key Features**:
- 10 operations: Ingest, Search, Get Hierarchy, Health Check, Get By Stage, Update Status, Batch Hierarchy, Get Final Summary, Get Complete Tree, Get Document with Context
- Comprehensive input validation to prevent invalid data from reaching the backend
- Error handling with user-friendly messages
- Support for both JSON string and object inputs

**Connection Points**:
- Communicates with `haystack-service` via HTTP requests on port 8000
- Sends validated, structured data to Python endpoints
- Handles response formatting for n8n workflow consumption

##### `nodes/HaystackSearch/haystack.svg`
**Purpose**: Visual icon for the node in n8n's workflow editor
- Provides visual identification in the node palette
- Enhances user experience with recognizable branding

##### `package.json`
**Purpose**: Node package configuration and dependencies
- Defines the node name: `n8n-nodes-haystack`
- Specifies n8n compatibility and build scripts
- Lists TypeScript and n8n workflow dependencies

##### `index.ts`
**Purpose**: Module entry point that exports the node class
- Registers `HaystackSearch` class for n8n to discover
- Enables dynamic loading when n8n starts

### 2. **Haystack Python Service** (`haystack-service/`)

#### Core Files:

##### `haystack_service_simple.py`
**Purpose**: Main FastAPI service providing document processing endpoints

**Key Features**:
- Document ingestion with hierarchical metadata
- Hybrid search (BM25 + vector embeddings with 384 dimensions)
- Hierarchical relationship tracking
- Atomic status updates with race condition prevention
- Memory-safe batch operations

**Endpoints**:

**Note**: The Haystack service uses `haystack_service_simple.py` which provides all 10 endpoints:

1. `GET /health` - Service health check
2. `POST /ingest` - Store documents with hierarchy metadata
3. `POST /search` - Search using hybrid/vector/BM25 methods
4. `POST /hierarchy` - Get document relationships
5. `POST /get_by_stage` - Retrieve documents by workflow stage
6. `POST /update_status` - Update document processing status atomically
7. `POST /batch_hierarchy` - Get hierarchy for multiple documents efficiently
8. `GET /get_final_summary/{workflow_id}` - Get the final summary document for a workflow
9. `GET /get_complete_tree/{workflow_id}` - Get complete hierarchical tree structure
10. `GET /get_document_with_context/{document_id}` - Get document with navigation context

**Connection Points**:
- Connects to Elasticsearch on port 9200
- Uses SentenceTransformer for embeddings (`BAAI/bge-small-en-v1.5`)
- Provides REST API consumed by n8n node

##### `elasticsearch_setup.py`
**Purpose**: Initialize Elasticsearch index with proper mappings

**Key Features**:
- Creates `judicial-documents` index
- Defines mappings for:
  - Vector embeddings (384 dimensions)
  - Hierarchical metadata structure
  - Text fields with keyword sub-fields
- Sets up analyzers for legal document processing

**Connection Points**:
- Must be run before first use to create index structure
- Defines schema used by both `haystack_service.py` and `haystack_service_simple.py`

##### `test_integration.py`
**Purpose**: Integration test suite for the Haystack service

**Key Features**:
- Tests all endpoints with sample data
- Validates hierarchical relationships
- Checks search functionality
- Ensures proper error handling

**Usage**:
```bash
python test_integration.py
```

##### `requirements.txt` / `requirements-minimal.txt`
**Purpose**: Python dependencies for the service

**Key Packages**:
- `fastapi` & `uvicorn` - REST API framework
- `elasticsearch` - Document storage
- `sentence-transformers` - Text embeddings
- `psutil` - Memory monitoring
- `pydantic` - Data validation

##### `Dockerfile`
**Purpose**: Container configuration for the Haystack service

**Key Features**:
- Python 3.9 base image
- Installs all dependencies
- Exposes port 8000
- Runs service with uvicorn

### 3. **Docker Configuration** (`docker-compose.haystack.yml`)

**Purpose**: Orchestrates Elasticsearch and Haystack services

**Services Defined**:
1. **elasticsearch**:
   - Port 9200 (HTTP) and 9300 (transport)
   - 2GB heap size (configured with ES_JAVA_OPTS=-Xms2g -Xmx2g)
   - Single-node discovery
   - Persistent volume for data

2. **haystack-service**:
   - Depends on Elasticsearch
   - Port 8000 for API access
   - Auto-restart on failure
   - Connected to backend network

**Connection Points**:
- Creates `haystack_data` volume for persistence
- Uses `data_compose_backend` network for service communication

### 4. **Utility Scripts**

##### `start_haystack_services.sh`
**Purpose**: Convenience script to start Haystack stack

**Features**:
- Checks for main services running
- Starts Elasticsearch and Haystack
- Shows container status
- Uses the full-featured `haystack_service_simple.py` by default

##### `cleanup_haystack_only.sh`
**Purpose**: Clean shutdown and data removal

**Features**:
- Stops Haystack-related containers
- Optionally removes volumes
- Preserves main n8n data

## Data Flow

### 1. **Document Ingestion Flow**
```
n8n Workflow → Haystack Node → /ingest endpoint → Elasticsearch
```
- Documents include hierarchy metadata (parent_id, level, children_ids)
- Embeddings generated automatically
- Parent-child relationships updated bidirectionally

### 2. **Search Flow**
```
n8n Workflow → Haystack Node → /search endpoint → Elasticsearch → Results
```
- Supports three search modes: hybrid, vector, BM25
- Can include hierarchical context in results
- Filters by metadata fields

### 3. **Hierarchy Navigation Flow**
```
n8n Workflow → Haystack Node → /hierarchy endpoint → Related Documents
```
- Retrieves parent and child documents
- Configurable depth traversal
- Returns full context for analysis

### 4. **Workflow Processing Flow**
```
Get By Stage → Process Documents → Update Status → Next Stage
```
- Documents move through stages: ready_chunk → ready_summarize → ready_aggregate → completed
- Status updates are atomic with retry logic
- Batch operations for efficiency

## Key Integration Points

### 1. **n8n to Python Service**
- HTTP communication on port 8000
- JSON request/response format
- Comprehensive error handling

### 2. **Python Service to Elasticsearch**
- Direct client connection
- Index: `judicial-documents`
- Supports vector and text search

### 3. **Hierarchical Data Model**
```json
{
  "document_id": "unique-id",
  "content": "Document text",
  "document_type": "source_document|chunk|summary",
  "hierarchy": {
    "level": 0,
    "parent_id": "parent-doc-id",
    "children_ids": ["child-1", "child-2"]
  },
  "metadata": {
    "processing_status": "ready|processing|completed",
    "source": "original-file.pdf"
  }
}
```

## Usage in n8n Workflows

### Example 1: Document Ingestion
```javascript
// Haystack Search Node Configuration
Operation: Ingest Documents
Documents: [
  {
    "content": "Legal document text",
    "metadata": {"source": "case-law.pdf"},
    "document_type": "source_document",
    "document_id": "doc-12345",
    "parent_id": null,
    "hierarchy_level": 0
  }
]
```

### Example 2: Recursive Summarization
```javascript
// Step 1: Get documents ready for summarization
Operation: Get By Stage
Stage Type: Ready for Summarization
Hierarchy Level: 1

// Step 2: Process documents (AI summarization)
// ... your AI processing ...

// Step 3: Update status
Operation: Update Status
Document ID: {{$json.id}}
Processing Status: Processing Complete
```

### Example 3: Batch Hierarchy Retrieval
```javascript
Operation: Batch Hierarchy
Document IDs: ["doc-1", "doc-2", "doc-3"]
Include Parents: true
Include Children: true
```

## Performance Considerations

1. **Batch Operations**: Use batch endpoints for multiple documents
2. **Memory Limits**: 50 documents max per batch, 50MB content limit
3. **Concurrent Updates**: Automatic retry with exponential backoff
4. **Search Optimization**: Use filters to narrow results
5. **Content Truncation**: Large documents truncated in hierarchy views

## Troubleshooting

### Common Issues:

1. **"Elasticsearch not initialized"**
   - Ensure Elasticsearch is running: `docker ps | grep elasticsearch`
   - Check logs: `docker logs elasticsearch`

2. **"Document not found"**
   - Verify document ID exists
   - Check if document was successfully ingested

3. **"Version conflict"**
   - Normal during concurrent updates
   - System automatically retries

4. **Memory warnings**
   - Reduce batch size
   - Check system resources: `docker stats`

### Health Checks:
```bash
# Check Haystack service
curl http://localhost:8000/health

# Check Elasticsearch
curl http://localhost:9200/_cluster/health
```

## Security Considerations

1. **Input Validation**: All inputs validated in TypeScript before reaching Python
2. **Metadata Injection Prevention**: Keys and values sanitized
3. **Memory Protection**: Strict limits on content size
4. **Network Isolation**: Services communicate on Docker network
5. **Error Information**: Sensitive details excluded from user-facing errors

## Implementation Notes

### Service Implementation

The Docker configuration uses `haystack_service_simple.py` which provides all 10 endpoints including:
- Basic operations (ingest, search, hierarchy, health)
- Workflow management (get by stage, update status)
- Batch operations (batch hierarchy)
- Tree navigation (get final summary, get complete tree, get document with context)

## Future Enhancements

1. **Authentication**: Add API key support
2. **Compression**: Compress large documents
3. **Caching**: Add Redis for frequently accessed documents
4. **Monitoring**: Prometheus metrics endpoint
5. **Backup**: Automated Elasticsearch snapshots