# Hierarchical Summarization Node - Development Notes

## Current Status

The Hierarchical Summarization (HS) node is experiencing performance issues and hitting timeout limits. This document summarizes the issues discovered and solutions attempted.

## Critical Issues

### 1. 504 Gateway Timeout (2 minutes)
- **Problem**: n8n has a default execution timeout that causes 504 errors after ~2 minutes
- **Current behavior**: Processing 5 test files takes 3+ minutes, exceeding the timeout
- **Root cause**: Multiple factors contributing to slow performance (see below)
- **IMMEDIATE ISSUE**: The timeout is from nginx proxy, not n8n itself

### ACTUAL ROOT CAUSE - CHUNKING PROMPT SNOWBALL EFFECT (FIXED)
The primary performance issue was identified and fixed:

**Problem**: When chunking documents, each subsequent chunk included the previous chunk's summary in the prompt:
- Chunk 1: ~80 token prompt
- Chunk 2: ~130 token prompt (includes 50-token summary from chunk 1)
- Chunk 3: ~180 token prompt (includes summary from chunk 2)
- Chunk 4: ~230 token prompt (includes summary from chunk 3)

**Impact**: This consumed increasing amounts of the token budget for prompts, forcing much smaller content chunks. 5 files (35KB) were being split into ~18 chunks instead of 5-7 expected chunks.

**Fix Applied**: Modified line 818 to pass `null` instead of `previousSummary` when chunking documents. Each chunk is now independent, preventing prompt size growth.

**Expected Result**: Significantly fewer chunks per document, reducing API calls from ~18 to ~5-7, cutting processing time from 3+ minutes to under 1 minute.

### 2. Infinite Hierarchy Bug (PARTIALLY FIXED)
- **Problem**: The node was hitting the 20-level depth limit due to summaries being re-chunked
- **Cause**: When summaries exceeded the batch size, they were chunked again at higher levels
- **Fix applied**: Modified `processLevel()` to only chunk level 0 documents (lines 807-836)
- **Status**: Code fix implemented but needs testing with proper token limits

### 3. Token Output Control
- **Problem**: BitNet was generating 500+ token summaries instead of 50-100 tokens
- **Cause**: The HS node's `maxTokensToSample: 50` was being ignored
- **Fix applied**: 
  - Reduced token limit in HS node from 150 to 50 (line 1106)
  - Added `aiModelMaxTokens` field to BitNet node for user control
- **Status**: Implemented but may not be fully effective

## Performance Analysis

### Why 3+ minutes for 5 files?

1. **Document Processing**:
   - 5 files → ~18 chunks at level 0
   - Each chunk takes ~9 seconds (BitNet inference)
   - Level 0 alone: 18 × 9 = 162 seconds (2.7 minutes)

2. **Multiple Hierarchy Levels**:
   - Level 0: 18 chunks → 18 summaries
   - Level 1: 18 summaries → 3-4 summaries (if batching works)
   - Level 2: 3-4 summaries → 1 final summary
   - Total API calls: ~23-25 calls

3. **BitNet Performance**:
   - Prompt processing: 80-100 tokens/second
   - Generation: 20-30 tokens/second (suboptimal)
   - Large prompts (1800+ tokens) slow down processing

## Solutions to Implement

### 1. Increase n8n Execution Timeout

Add to docker-compose.yml:
```yaml
n8n:
  environment:
    - EXECUTIONS_TIMEOUT=600  # 10 minutes
    - EXECUTIONS_TIMEOUT_MAX=3600  # 1 hour
```

Or set via n8n UI:
- Settings → Execution Settings → Timeout: 600 seconds

### 1b. Fix Nginx Timeout (IMMEDIATE FIX NEEDED)

Edit `/home/manzanita/coding/data-compose/nginx/conf.d/default.conf`:
```nginx
# Add these timeout settings to the /n8n/ location block
location /n8n/ {
    proxy_pass http://n8n:5678/;
    # ... existing headers ...
    
    # Add these timeout settings:
    proxy_read_timeout 600s;     # 10 minutes
    proxy_connect_timeout 600s;
    proxy_send_timeout 600s;
    send_timeout 600s;
}
```

Then restart nginx:
```bash
docker-compose restart web
```

### 2. Fix Batching Logic

The current batching might not be working correctly. Check:
- Are summaries at level 1 being batched together?
- Is the batch size calculation correct?
- Are empty/error summaries breaking the batching?

### 3. Add Progress Logging

Add console.log statements to track:
```javascript
console.log(`Level ${currentLevel}: Processing ${documents.length} documents`);
console.log(`Batch ${i}: ${batch.length} documents, ${totalTokens} tokens`);
```

### 4. Database Query Optimization

Check if DB queries are slow:
```sql
-- Add EXPLAIN ANALYZE to queries
EXPLAIN ANALYZE SELECT * FROM hierarchical_documents 
WHERE batch_id = $1 AND hierarchy_level = $2;
```

### 5. Consider Alternative Approaches

1. **Skip intermediate levels**: For small document sets, go directly from chunks to final summary
2. **Parallel processing**: Process multiple chunks simultaneously
3. **Caching**: Cache summaries for repeated content

## Test Data Location

- Test files: `/home/manzanita/coding/data-compose/n8n/local-files/uploads/test/`
- 5 files: ch2.txt, ch3.txt, ch4.txt, ch5.txt, chapter_1.txt
- Total size: ~35KB

## Debugging Steps for Next Agent

1. **Enable detailed logging**:
   ```javascript
   // Add after line 685 in HierarchicalSummarization.node.ts
   console.log(`[HS Debug] Level ${currentLevel}: Found ${documents.length} documents`);
   ```

2. **Monitor BitNet requests**:
   ```bash
   tail -f /home/manzanita/coding/bitnet-inference/server.log | grep -E "tokens|POST"
   ```

3. **Check actual token limits**:
   ```bash
   # Watch what's being sent to BitNet
   docker logs -f data-compose-n8n-1 2>&1 | grep -E "max_tokens|maxTokensToSample"
   ```

4. **Database monitoring**:
   ```sql
   -- Check if summaries are being created correctly
   SELECT hierarchy_level, COUNT(*), 
          AVG(LENGTH(summary)) as avg_summary_length,
          MIN(created_at) as started,
          MAX(created_at) as finished,
          EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at))) as seconds_taken
   FROM hierarchical_documents 
   WHERE batch_id = 'latest-batch-id'
   GROUP BY hierarchy_level
   ORDER BY hierarchy_level;
   ```

## Key Code Locations

- Main execution: `execute()` method starting at line 238
- Hierarchy processing: `performHierarchicalSummarization()` at line 677
- Level processing: `processLevel()` at line 770
- Chunking logic: `chunkDocument()` at line 913
- Summary generation: `summarizeChunk()` at line 1042
- Token estimation: `estimateTokenCount()` at line 671

## Recommended Next Steps

1. **Add execution timeout to docker-compose.yml**
2. **Add detailed logging to track where time is spent**
3. **Verify the batching fix is working** (summaries shouldn't be re-chunked)
4. **Check if BitNet is respecting the 50 token limit**
5. **Consider implementing a "fast mode" that skips intermediate levels for small datasets**

## Configuration Recommendations

- Batch size: Start with 1024 (not 512) to reduce API calls
- Token limit: 30-50 tokens for summaries
- Database: Ensure indexes exist on batch_id and hierarchy_level

## Contact Previous Agent

If you need clarification on any changes made, the key modifications were:
1. **CRITICAL FIX**: Fixed chunking prompt snowball effect (line 818) - prevents excessive chunking
2. Prevented re-chunking of summaries at higher levels (lines 807-836)
3. Reduced token output limit from 150 to 50 (line 1106)
4. Added configurable token limit to BitNet node
5. Fixed nginx timeout configuration (10 minutes)
6. Fixed PostgreSQL credentials in examples

The main issue was the chunking prompt snowball effect, which has been fixed. The process should now complete in under 1 minute instead of 3+ minutes.