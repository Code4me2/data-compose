# Hierarchical Summarization Node - Development Notes

## Current Status (UPDATED)

The Hierarchical Summarization (HS) node has been significantly improved with a new architecture that provides better traceability, fixes the infinite recursion bug, and includes comprehensive resilience features for handling AI server failures.

## Architecture Overview

### 4-Level Hierarchy Structure
- **Level 0**: Source documents (original content)
- **Level 1**: Batches/chunks (grouped documents, content only, NO summaries)
- **Level 2**: First summaries (summaries of Level 1 batches)
- **Level 3+**: Higher-level summaries (progressively condensed)

### Key Improvements
1. **Fixed Infinite Recursion**: Summaries are never re-chunked at higher levels
2. **Complete Traceability**: Can trace any summary back to exact source content
3. **BitNet Resilience**: Comprehensive protection against AI server failures
4. **Automatic Schema Migration**: Handles database updates seamlessly

## BitNet Server Resilience Implementation

### Overview
Comprehensive resilience features have been implemented to handle BitNet server failures gracefully. The system now includes retry logic with exponential backoff, circuit breaker pattern, and rate limiting.

### Implementation Details

#### 1. Retry Logic (Phase 1)
- **Location**: `summarizeChunk()` function in HierarchicalSummarization.node.ts
- **Strategy**: Exponential backoff with jitter
- **Configuration**:
  - Max retries: 3 (configurable)
  - Initial delay: 1 second
  - Max delay: 32 seconds
  - Backoff multiplier: 2
  - Jitter factor: 0.1 (±10% randomization)
- **Request timeout**: 60 seconds per attempt

#### 2. Circuit Breaker (Phase 2)
- **Pattern**: Prevents cascading failures
- **States**:
  - **Closed**: Normal operation
  - **Open**: After 5 consecutive failures (configurable)
  - **Half-Open**: After 60 seconds, allows limited requests
- **Global instance**: Shared across all node executions
- **Recovery**: Automatically transitions back to closed state when server recovers

#### 3. Rate Limiting (Phase 3)
- **Purpose**: Prevents overwhelming BitNet server
- **Default limit**: 30 requests per minute (configurable)
- **Implementation**: Token bucket algorithm with request queuing
- **Features**:
  - Automatic request spacing
  - Queue management for burst handling
  - Graceful degradation under high load

#### 4. Fallback Summary Generation
- **Activation**: When all retries fail or circuit breaker is open
- **Method**: Extractive summarization using key sentences
- **Output**: Clearly marked as "[FALLBACK SUMMARY]" for transparency

### Configuration Options

All resilience features can be configured through the node's properties:

```javascript
{
  enableRetryLogic: true,        // Enable/disable retry attempts
  maxRetries: 3,                 // Number of retry attempts
  requestTimeout: 60000,         // Timeout per request (ms)
  enableFallbackSummaries: true, // Generate fallback summaries
  rateLimit: 30,                 // Requests per minute
  enableCircuitBreaker: true,    // Enable circuit breaker
  circuitBreakerThreshold: 5,    // Failures before opening
  circuitBreakerResetTime: 60000 // Reset timeout (ms)
}
```

### Testing

A test script is available at `test/test-resilience.js` that simulates various failure scenarios:
- Server timeouts
- Server errors (500)
- Empty responses
- Intermittent failures
- Complete server unavailability

### Monitoring and Logs

The implementation includes detailed logging:
```
[HS 0] Circuit breaker initialized
[HS 0] Rate limiter initialized: 30 requests/minute
[HS 0] [Retry] Attempt 1 failed: Connection refused. Retrying in 1047ms...
[CircuitBreaker] Opening circuit after 5 consecutive failures
[HS 0] Using fallback summary generation
```

## Database Schema Updates

### Automatic Migration
The node now automatically adds missing columns to existing databases:
- `document_type`: 'source', 'chunk', 'batch', or 'summary'
- `chunk_index`: Order within parent document
- `source_document_ids`: Array linking back to original documents
- `token_count`: Token count for each document

### Migration Code Location
- **Function**: `ensureDatabaseSchema()` at line 511
- **Method**: Uses PostgreSQL DO blocks to check and add columns
- **Safety**: Only adds columns if they don't exist

## Performance Optimizations

### Fixed Issues
1. **Chunking Prompt Snowball**: Fixed exponential prompt growth during chunking
2. **Token Budget**: Better token allocation for prompts vs content
3. **Batch Processing**: Improved batching logic for fewer API calls

### Current Performance
- **Processing Time**: ~1 minute for 5 documents (down from 3+ minutes)
- **API Calls**: Reduced by ~60% through better batching
- **Token Efficiency**: Maximized content per API call

## Key Code Locations

### Main Components
- **Main execution**: `execute()` method starting at line 238
- **Hierarchy processing**: `performHierarchicalSummarization()` at line 890
- **Level processing**: `processLevel()` at line 983
- **Chunking logic**: `chunkDocument()` at line 1202
- **Summary generation**: `summarizeChunk()` at line 1367
- **Database schema**: `ensureDatabaseSchema()` at line 511

### Resilience Features
- **Retry logic**: Implemented in `summarizeChunk()` at line 1367
- **Circuit breaker**: Class definition at line 88, usage at line 1420
- **Rate limiter**: Class definition at line 161, usage at line 1417
- **Fallback summaries**: `generateFallbackSummary()` at line 1326

## Configuration Recommendations

### Optimal Settings
- **Batch size**: 1024-2048 tokens (balances API calls vs processing time)
- **Token limit**: 50-100 tokens for summaries
- **Retry attempts**: 3 (sufficient for transient failures)
- **Rate limit**: 30 requests/minute (prevents server overload)
- **Circuit breaker threshold**: 5 failures (quick detection, prevents cascading)

### Database Indexes
Ensure these indexes exist for optimal performance:
```sql
CREATE INDEX idx_batch_level ON hierarchical_documents(batch_id, hierarchy_level);
CREATE INDEX idx_parent ON hierarchical_documents(parent_id);
CREATE INDEX idx_doc_type ON hierarchical_documents(document_type);
```

## Troubleshooting Guide

### Common Issues

1. **504 Gateway Timeout**
   - **Cause**: Nginx proxy timeout (default 2 minutes)
   - **Fix**: Update nginx config with longer timeouts
   - **Location**: `/home/manzanita/coding/data-compose/nginx/conf.d/default.conf`

2. **Database Column Missing**
   - **Cause**: Existing database without new columns
   - **Fix**: Automatic migration runs on node startup
   - **Manual fix**: Run schema.sql if needed

3. **BitNet Connection Refused**
   - **Cause**: BitNet server not running
   - **Fix**: Start BitNet server on port 11434
   - **Fallback**: Automatic fallback summaries generated

4. **Circuit Breaker Open**
   - **Cause**: Multiple consecutive BitNet failures
   - **Fix**: Wait 60 seconds for automatic recovery
   - **Override**: Restart n8n to reset circuit breaker

## Testing the Node

### Quick Functionality Test
1. Create test documents in a directory
2. Configure node with directory path
3. Connect to BitNet AI model
4. Run workflow and monitor logs

### Resilience Testing
```bash
# Run the test script
cd /home/manzanita/coding/data-compose/n8n/custom-nodes/n8n-nodes-hierarchicalSummarization
node test/test-resilience.js
```

### Database Verification
```sql
-- Check document hierarchy
SELECT 
    hierarchy_level,
    document_type,
    COUNT(*) as count,
    AVG(LENGTH(content)) as avg_content_length,
    AVG(LENGTH(summary)) as avg_summary_length
FROM hierarchical_documents
WHERE batch_id = 'your-batch-id'
GROUP BY hierarchy_level, document_type
ORDER BY hierarchy_level;
```

## Future Improvements

### Planned Enhancements
1. **Parallel Processing**: Process multiple chunks simultaneously
2. **Streaming Responses**: Handle large summaries with streaming
3. **Custom Summarization Strategies**: Different algorithms for different content types
4. **Caching Layer**: Cache summaries for repeated content
5. **Metrics Dashboard**: Real-time monitoring of processing performance

### Integration Testing Plan
See README.md for comprehensive integration testing strategy covering:
- Hierarchical architecture verification
- Resilience feature testing
- Database migration testing
- End-to-end workflow validation
- Performance benchmarking

## Contact for Issues

For questions about the implementation:
1. Check this CLAUDE.md file first
2. Review the inline code comments
3. Check test/test-resilience.js for examples
4. Consult README.md for user-facing documentation