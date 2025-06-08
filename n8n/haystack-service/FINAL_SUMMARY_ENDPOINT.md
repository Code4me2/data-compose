# Final Summary Endpoint Documentation

## Overview
The `/get_final_summary/{workflow_id}` endpoint provides a UI-optimized entry point for tree navigation in summarization workflows. It retrieves the final summary document and comprehensive metadata about the entire document tree.

## Endpoint Details

### URL
```
GET /get_final_summary/{workflow_id}
```

### Parameters
- `workflow_id` (path parameter): The unique identifier of the workflow

### Response Model
```python
class FinalSummaryResponse(BaseModel):
    workflow_id: str
    final_summary: Dict[str, Any]
    tree_metadata: Dict[str, Any]
    navigation_context: Dict[str, Any]
    status: str
```

### Response Structure

#### final_summary
Contains the final summary document with:
- `document_id`: Unique document identifier
- `content_preview`: First 500 characters of content
- `content_full`: Complete document content
- `content_length`: Total content length in characters
- `document_type`: Type of document (usually "summary")
- `summary_type`: Specific summary type (should be "final_summary")
- `metadata`: Additional document metadata
- `created_at`: Document creation timestamp
- `processing_status`: Current processing status

#### tree_metadata
Provides statistics about the entire document tree:
- `total_documents`: Total number of documents in the workflow
- `max_depth`: Maximum hierarchy level in the tree
- `document_types`: Count of each document type
- `level_distribution`: Document count at each hierarchy level
- `summary_types`: Count of each summary type

#### navigation_context
Navigation information for the final summary:
- `is_root`: Whether this is a root document (usually false for final summaries)
- `has_children`: Whether the document has children
- `children_ids`: List of child document IDs
- `parent_id`: Parent document ID (if any)
- `hierarchy_level`: Level in the hierarchy tree
- `total_children`: Number of direct children

### Error Responses

#### 404 Not Found
- No final summary exists for the given workflow_id

#### 409 Conflict
- Multiple final summaries found (data integrity issue)

#### 500 Internal Server Error
- Elasticsearch query failure or other server errors

## Usage Example

### Request
```bash
curl -X GET "http://localhost:8000/get_final_summary/abc123-def456-ghi789"
```

### Response
```json
{
  "workflow_id": "abc123-def456-ghi789",
  "final_summary": {
    "document_id": "final_abc123",
    "content_preview": "This comprehensive summary synthesizes all key findings from the analyzed documents...",
    "content_full": "This comprehensive summary synthesizes all key findings from the analyzed documents. The analysis reveals several important patterns...",
    "content_length": 2500,
    "document_type": "summary",
    "summary_type": "final_summary",
    "metadata": {
      "created_at": "2024-01-15T10:30:00Z",
      "processing_status": "completed"
    },
    "created_at": "2024-01-15T10:30:00Z",
    "processing_status": "completed"
  },
  "tree_metadata": {
    "total_documents": 15,
    "max_depth": 3,
    "document_types": {
      "source_document": 8,
      "summary": 7
    },
    "level_distribution": {
      "0": 8,
      "1": 4,
      "2": 2,
      "3": 1
    },
    "summary_types": {
      "chunk_summary": 4,
      "intermediate_summary": 2,
      "final_summary": 1
    }
  },
  "navigation_context": {
    "is_root": false,
    "has_children": false,
    "children_ids": [],
    "parent_id": "intermediate_summary_2",
    "hierarchy_level": 3,
    "total_children": 0
  },
  "status": "success"
}
```

## UI Integration

This endpoint is designed for UI components that need to:

1. **Display the final summary** as the initial view when opening a workflow
2. **Show tree statistics** to give users an overview of the document structure
3. **Enable navigation** to parent or child documents
4. **Provide context** about where the final summary sits in the hierarchy

The response includes both a content preview (for quick display) and full content (for detailed viewing), making it efficient for UIs that progressively disclose information.

## Testing

Use the provided test script to verify the endpoint:

```bash
# Test with existing workflow
python test_final_summary.py <workflow_id>

# Create test workflow and test
python test_final_summary.py
```