# Explicit Format Specification

## Required Input Formats

### ✅ EXPLICITLY DOCUMENTED

#### 1. Single Document Input (Previous Node)
```javascript
{
  json: {
    content: "Document text content here...",     // REQUIRED: string
    metadata: { source: "file.txt" }             // OPTIONAL: object
  }
}
```

#### 2. Multiple Documents Input (Previous Node)
```javascript
[
  {
    json: {
      content: "First document...",               // REQUIRED: string
      metadata: { source: "doc1.txt" }           // OPTIONAL: object
    }
  },
  {
    json: {
      content: "Second document...",              // REQUIRED: string  
      metadata: { source: "doc2.txt" }           // OPTIONAL: object
    }
  }
]
```

#### 3. Directory Input (Node Parameters)
- **contentSource**: `"directory"` 
- **directoryPath**: `"/path/to/documents/"` (absolute path to .txt files)

## Required Node Parameters

### ✅ EXPLICITLY DOCUMENTED

| Parameter | Type | Constraints | Default | Required |
|-----------|------|-------------|---------|----------|
| `summaryPrompt` | string | Must contain `<c></c>` tokens | `"summarize the content between the two tokens <c></c> in two or less sentences"` | Yes |
| `contextPrompt` | string | Any additional text | `""` | No |
| `contentSource` | enum | `"directory"` or `"previousNode"` | `"directory"` | Yes |
| `directoryPath` | string | Valid directory path | `""` | Yes (if `contentSource="directory"`) |
| `batchSize` | number | 100 ≤ value ≤ 32768 | 2048 | Yes |
| `databaseConfig` | enum | `"credentials"`, `"manual"` | `"credentials"` | Yes |

## Required Output Format

### ✅ EXPLICITLY DOCUMENTED

```javascript
{
  json: {
    batchId: "UUID-string",                       // ALWAYS: UUID v4
    finalSummary: "Summary text...",              // ALWAYS: string
    totalDocuments: 5,                            // ALWAYS: positive integer
    hierarchyDepth: 2,                            // ALWAYS: non-negative integer
    processingComplete: true                      // ALWAYS: true (on success)
  }
}
```

## Required Connections

### ✅ EXPLICITLY DOCUMENTED

#### 1. AI Language Model Connection (Required)
- **Type**: `NodeConnectionType.AiLanguageModel`
- **Compatible Models**: OpenAI GPT, Anthropic Claude, etc.
- **Purpose**: Generates document summaries
- **Error if missing**: `"No language model connected. Please connect an AI language model to this node."`

#### 2. Main Input Connection (Optional)
- **Type**: `NodeConnectionType.Main`
- **Purpose**: Receives document data from previous nodes
- **Format**: Single item or array of items with `json.content` field

## Content Requirements

### ✅ EXPLICITLY DOCUMENTED

#### Input Content Field
- **Field Name**: `content` (exact name required)
- **Type**: `string`
- **Content**: Any text content for summarization
- **Error if missing**: `"No content field found in input data"`

#### Directory Files
- **File Extension**: `.txt` files only
- **Location**: Files must exist in specified `directoryPath`
- **Error if none found**: `"No .txt files found in directory"`
- **Error if path invalid**: `"Cannot access directory: ENOENT: no such file or directory"`

## Token Budget Calculation

### ✅ EXPLICITLY DOCUMENTED

```
Available Content Tokens = batchSize - promptTokens - 50 (safety buffer)
```

**Example with batchSize 1024:**
- Summary prompt: ~20 tokens
- Context prompt: ~15 tokens  
- Safety buffer: 50 tokens
- **Available for content: 939 tokens**

**Minimum Requirements:**
- Total prompt tokens + 50 + 100 (minimum content) ≤ batchSize
- Error if violated: `"Batch size X too small for prompts"`

## Database Schema Requirements

### ✅ EXPLICITLY DOCUMENTED (for credentials/manual config)

```sql
-- Required table structure
hierarchical_documents (
  id SERIAL PRIMARY KEY,
  content TEXT NOT NULL,
  summary TEXT,
  batch_id VARCHAR(255) NOT NULL,
  hierarchy_level INTEGER NOT NULL,
  parent_id INTEGER REFERENCES hierarchical_documents(id),
  child_ids INTEGER[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  token_count INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

processing_status (
  id SERIAL PRIMARY KEY,
  batch_id VARCHAR(255) UNIQUE NOT NULL,
  current_level INTEGER NOT NULL DEFAULT 0,
  total_documents INTEGER,
  processed_documents INTEGER DEFAULT 0,
  status VARCHAR(50) NOT NULL DEFAULT 'processing',
  error_message TEXT,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);
```

## Error Response Formats

### ✅ EXPLICITLY DOCUMENTED

All errors follow this format:
```javascript
{
  "error": "NodeOperationError",
  "message": "Specific error description"
}
```

**Common Error Messages:**
- `"Batch size X too small for prompts"`
- `"No language model connected. Please connect an AI language model to this node."`
- `"Failed to connect to database. Check your credentials or configuration."`
- `"Cannot access directory: ENOENT: no such file or directory, scandir 'path'"`
- `"No content field found in input data"`
- `"No .txt files found in directory path"`

## Summary

**YES** - The documentation explicitly specifies:
✅ **Input formats** with exact JSON structures  
✅ **Output format** with all required fields  
✅ **Parameter types, constraints, and defaults**  
✅ **Connection requirements** with specific node types  
✅ **Database schema** for manual configurations  
✅ **Error formats** with exact error messages  
✅ **Token calculation** with precise formulas  
✅ **Content requirements** with field names and types  

The specification is comprehensive and leaves little ambiguity about expected formats and requirements.