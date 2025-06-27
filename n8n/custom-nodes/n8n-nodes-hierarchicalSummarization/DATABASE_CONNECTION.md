# Database Connection Implementation

## Overview

The Hierarchical Summarization node stores document hierarchies and processing metadata in PostgreSQL:

### Connection Points

1. **Main Input** (left side) - Standard data input (optional)
2. **Language Model** (bottom) - Required AI model connection

## Database Configuration Options

The node supports two database connection methods:

### 1. Use Credentials (Default)
- Uses PostgreSQL credentials configured in n8n
- Standard n8n credential management
- Automatic schema creation
- Most secure and reusable approach

### 2. Manual Configuration
- Manually enter database connection parameters
- Useful for testing or one-off connections
- Automatic schema creation

## Usage

1. Add the Hierarchical Summarization node to your workflow
2. Connect a Language Model node (e.g., OpenAI, Anthropic) to the Language Model input
3. Configure database access:
   - For Credentials: Select your PostgreSQL credentials from the dropdown
   - For Manual: Enter host, port, database, user, and password
4. Configure the summarization parameters
5. Run the workflow

## Database Schema

When using credentials or manual configuration, the node automatically creates:

```sql
-- Main documents table
hierarchical_documents
  - id (primary key)
  - content (source text)
  - summary (generated summary)
  - batch_id (processing batch identifier)
  - hierarchy_level (0 for source, increases for summaries)
  - parent_id (reference to parent document)
  - child_ids (array of child document IDs)
  - metadata (JSON data)
  - token_count
  - timestamps

-- Processing status table
processing_status
  - batch_id
  - current_level
  - total_documents
  - processed_documents
  - status
  - timestamps
```

## Important Notes

1. **Database Type**: Currently supports PostgreSQL databases only
2. **Automatic Schema**: The node automatically creates required tables on first use
3. **Transactions**: All database operations are wrapped in transactions for data integrity
4. **Connection Pooling**: Uses connection pooling for better performance

## Future Enhancements

- Support for additional database types (MySQL, SQLite, etc.)
- Vector embedding storage for semantic search
- Custom schema configuration options
- Connection pooling configuration