# Hierarchical Summarization Visualization - Issue Analysis & Solution

## Problem Summary

The hierarchical visualization is not showing data because there's a missing connection between the backend data storage and the frontend retrieval mechanism.

## Root Cause Analysis

### 1. Data Storage (✅ Working)
- The Hierarchical Summarization node correctly processes documents
- Data is properly stored in PostgreSQL with parent-child relationships
- Tables: `hierarchical_documents` and `processing_status`

### 2. Data Output (⚠️ Limited)
The node only outputs:
```json
{
  "batchId": "uuid-here",
  "finalSummary": "...",
  "totalDocuments": 5,
  "hierarchyDepth": 3,
  "processingComplete": true
}
```

### 3. Frontend Expectation (❌ Unmet)
The frontend sends:
```json
{
  "action": "get_summaries",
  "batchId": "uuid-here",
  "timestamp": "2024-01-17T..."
}
```

And expects to receive the full hierarchy structure as shown in the mock data.

### 4. Missing Link (❌ Not Implemented)
No webhook handler exists to:
1. Receive the `get_summaries` action
2. Query PostgreSQL for the batch data
3. Return the formatted hierarchy

## Solution

You need to create an n8n workflow that handles the data retrieval. Here's the complete solution:

### Option 1: Add to Existing Workflow (Recommended)

Update your hierarchical summarization workflow to handle both processing AND retrieval:

```json
{
  "name": "Hierarchical Summarization with Retrieval",
  "nodes": [
    {
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "parameters": {
        "path": "c188c31c-1c45-4118-9ece-5b6057ab5177",
        "responseMode": "lastNode"
      }
    },
    {
      "name": "Switch",
      "type": "n8n-nodes-base.switch",
      "parameters": {
        "dataType": "string",
        "value1": "={{$json.action}}",
        "rules": {
          "rules": [
            {
              "value2": "hierarchical_summarization"
            },
            {
              "value2": "get_summaries"
            }
          ]
        }
      }
    },
    {
      "name": "PostgreSQL - Get Hierarchy",
      "type": "n8n-nodes-base.postgres",
      "parameters": {
        "operation": "executeQuery",
        "query": "WITH batch_data AS (\n    SELECT \n        id,\n        content,\n        summary,\n        hierarchy_level,\n        parent_id,\n        child_ids,\n        metadata,\n        COALESCE(metadata->>'filename', metadata->>'source', 'document_' || id) as source_name\n    FROM hierarchical_documents\n    WHERE batch_id = $1\n    ORDER BY hierarchy_level, id\n),\nlevel_counts AS (\n    SELECT \n        hierarchy_level,\n        COUNT(*) as doc_count,\n        CASE \n            WHEN hierarchy_level = 0 THEN 'Source Documents'\n            WHEN hierarchy_level = 1 THEN 'Initial Summaries'\n            WHEN hierarchy_level = 2 THEN 'Combined Summaries'\n            WHEN hierarchy_level = (SELECT MAX(hierarchy_level) FROM batch_data) THEN 'Final Summary'\n            ELSE 'Level ' || hierarchy_level\n        END as label\n    FROM batch_data\n    GROUP BY hierarchy_level\n)\nSELECT json_build_object(\n    'batchId', $1,\n    'levels', (\n        SELECT json_agg(\n            json_build_object(\n                'level', hierarchy_level,\n                'count', doc_count,\n                'label', label\n            ) ORDER BY hierarchy_level\n        )\n        FROM level_counts\n    ),\n    'documents', (\n        SELECT json_object_agg(\n            hierarchy_level::text,\n            level_docs\n        )\n        FROM (\n            SELECT \n                hierarchy_level,\n                json_agg(\n                    json_build_object(\n                        'id', id,\n                        'content', content,\n                        'summary', summary,\n                        'source', source_name,\n                        'parent_id', parent_id,\n                        'child_ids', child_ids\n                    ) ORDER BY id\n                ) as level_docs\n            FROM batch_data\n            GROUP BY hierarchy_level\n        ) as grouped_docs\n    )\n) as hierarchy;",
        "additionalFields": {
          "queryParams": "={{$json.batchId}}"
        }
      },
      "credentials": {
        "postgres": {
          "id": "1",
          "name": "Postgres account"
        }
      }
    },
    {
      "name": "Format Hierarchy Response",
      "type": "n8n-nodes-base.set",
      "parameters": {
        "values": {
          "string": [
            {
              "name": "hierarchy",
              "value": "={{$json.hierarchy}}"
            }
          ]
        },
        "options": {
          "dotNotation": false
        }
      }
    }
  ],
  "connections": {
    "Webhook": {
      "main": [[{"node": "Switch"}]]
    },
    "Switch": {
      "main": [
        [{"node": "Hierarchical Summarization"}],
        [{"node": "PostgreSQL - Get Hierarchy"}]
      ]
    },
    "PostgreSQL - Get Hierarchy": {
      "main": [[{"node": "Format Hierarchy Response"}]]
    }
  }
}
```

### Option 2: Quick Test Modification

For immediate testing, modify your frontend to use the mock data with a real batch ID:

```javascript
// In website/js/app.js, modify the showHierarchyVisualization function
async function showHierarchyVisualization(batchId) {
    if (!batchId || batchId.trim() === '') {
        alert('Please enter a batch ID');
        return;
    }
    
    // For testing: always use mock data but with the real batch ID
    const mockData = createMockHierarchy(batchId);
    window.lastHierarchyData = mockData;
    displayHierarchyTree(mockData);
    
    // Show the visualization container
    const vizContainer = document.getElementById('hierarchy-visualization');
    vizContainer.classList.remove('hidden');
}
```

### Option 3: Direct Database Connection

If you want to bypass n8n for testing, you could create a simple API endpoint that queries PostgreSQL directly. However, this goes against the n8n-centric architecture.

## Implementation Steps

1. **Import the updated workflow** into n8n
2. **Configure PostgreSQL credentials** in the workflow
3. **Test with a known batch ID**:
   - First run the hierarchical summarization to get a batch ID
   - Then test the visualization with that batch ID

## Database Connection Details

Make sure your PostgreSQL node uses these connection parameters:
- Host: `db` (if using Docker) or `localhost`
- Database: `mydb` (from your .env)
- User: `vel` (from your .env)
- Password: Your configured password
- Port: `5432`

## Testing the Fix

1. Run hierarchical summarization on some test documents
2. Copy the returned `batchId`
3. Enter the batch ID in the frontend visualization
4. The visualization should now display the actual hierarchy

## Alternative: Add Retrieval to the Node

You could also modify the Hierarchical Summarization node to have an "operation" parameter:
- `summarize`: Current behavior
- `retrieve`: Query and return hierarchy data

This would require modifying the TypeScript node code.