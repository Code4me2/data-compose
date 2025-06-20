# Minimal Integration Example for Intermediate Processing

## Summary of Changes Needed

To add intermediate processing to the BitNet recursive summarization with minimal impact:

### 1. Add Import (Line 12)
```typescript
import { RecursiveSummaryManager, SummaryLevel } from './RecursiveSummary';
import { IntermediateProcessor } from './IntermediateProcessing'; // ADD THIS LINE
```

### 2. Add UI Option to summaryOptions (Around line 302)
Add these options to the existing `summaryOptions` collection:

```typescript
{
  displayName: 'Enable Smart Grouping',
  name: 'enableSmartGrouping',
  type: 'boolean',
  default: false,
  description: 'Group similar content before summarizing for better results',
},
{
  displayName: 'Max Groups',
  name: 'maxGroups',
  type: 'number',
  default: 5,
  displayOptions: {
    show: {
      enableSmartGrouping: [true],
    },
  },
  description: 'Maximum number of content groups',
},
```

### 3. Modify the Summarization Loop (Around line 767)
Replace the existing chunk processing with this enhanced version:

```typescript
// Check if smart grouping is enabled
const enableSmartGrouping = summaryOptions.enableSmartGrouping as boolean || false;

if (enableSmartGrouping && chunks.length > 2) {
  // Use smart grouping
  const groups = IntermediateProcessor.groupChunksBySimilarity(
    chunks,
    summaryOptions.maxGroups as number || 5
  );
  
  // Process by groups for better context
  for (const group of groups) {
    const mergedText = IntermediateProcessor.mergeGroupedChunks(chunks, group);
    const prompt = summaryManagerWithConfig.generateSummaryPrompt(
      mergedText, 
      currentLevel,
      { topic: summaryOptions.topic }
    );
    
    const response = await this.helpers.httpRequest({
      method: 'POST',
      url: `${serverUrl}/completion`,
      headers: { 'Content-Type': 'application/json' },
      body: {
        prompt,
        temperature: additionalOptions.temperature || 0.7,
        max_tokens: Math.floor(mergedText.length * config.summaryRatio / 4),
        top_p: additionalOptions.topP || 0.9,
        top_k: additionalOptions.topK || 40,
      },
      json: true,
    });
    
    summaries.push(response.choices?.[0]?.text || response.content || '');
  }
  
  // Add grouping info to metadata
  levels[currentLevel].metadata.groupingUsed = true;
  levels[currentLevel].metadata.groupCount = groups.length;
} else {
  // Original processing (keep existing code exactly as is)
  for (const chunk of chunks) {
    // ... existing chunk processing code ...
  }
}
```

## That's It!

With these minimal changes:
- **Existing workflows continue to work exactly as before** (smart grouping is off by default)
- **Users can enable smart grouping** with a simple checkbox
- **Better summaries** when processing documents with related sections
- **Easy to extend** later with more processing options

## Benefits of This Approach

1. **Zero Breaking Changes**: All existing functionality preserved
2. **Opt-in Enhancement**: Users choose when to use it
3. **Minimal Code Changes**: ~50 lines of code added
4. **Easy to Test**: Can A/B test with/without grouping
5. **Future-Proof**: Easy to add more processors later

## Testing

1. Run any existing workflow - it should work identically
2. Enable "Smart Grouping" on a document with multiple related sections
3. Compare the output quality with and without grouping
4. Check that the summaries maintain better context when grouped