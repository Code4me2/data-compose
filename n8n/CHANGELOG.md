# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2024-05-31

### Added
- Initial release of n8n-nodes-haystack
- Custom n8n node for Haystack and Elasticsearch integration
- Document ingestion with hierarchy support
- Hybrid search capabilities (BM25 + vector search)
- Document hierarchy management (parent-child relationships)
- FastAPI service for document processing
- BAAI/bge-small-en-v1.5 embedding model integration
- Elasticsearch document store with 384-dimensional vectors
- Docker Compose configuration for easy deployment
- Comprehensive test suite and integration tests
- Health check endpoints for monitoring
- Interactive API documentation via Swagger UI

### Technical Details
- TypeScript implementation for n8n node
- Python 3.10+ FastAPI service
- Elasticsearch 8.17.1 with HNSW indexing
- Support for batch document processing
- Automatic parent-child relationship management
- Configurable search modes (hybrid, vector, BM25)

### Documentation
- Comprehensive README with installation instructions
- API reference documentation
- Troubleshooting guide
- Development workflow documentation
- Contributing guidelines

### Known Issues
- Initial Elasticsearch startup may take several minutes
- Node may require n8n restart to appear after installation

[0.1.0]: https://github.com/judicial-access/n8n-nodes-haystack/releases/tag/v0.1.0