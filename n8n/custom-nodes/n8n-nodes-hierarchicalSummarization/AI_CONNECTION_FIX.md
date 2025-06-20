# AI Language Model Connection Fix for Hierarchical Summarization Node

## Problem
The Hierarchical Summarization node was failing to properly connect to AI language models in n8n. The error occurred because the node was using incorrect methods to access the AI model connection:

1. `getInputData(1)` - This gets regular data from nodes, not AI model connections
2. Complex fallback logic that wasn't following n8n's supply data pattern

## Solution
The fix simplifies the connection logic to use n8n's standard method for accessing AI language model connections:

```typescript
// The correct way to get AI model connections in n8n
languageModel = await executeFunctions.getInputConnectionData(
  NodeConnectionType.AiLanguageModel,
  0 // Index 0 for the first (and only) AI model connection
);
```

## How It Works

### 1. Node Configuration
The node properly declares an AI Language Model input:
```typescript
inputs: [
  NodeConnectionType.Main,
  {
    type: NodeConnectionType.AiLanguageModel,
    required: true,
    displayName: 'Language Model',
    maxConnections: 1,
  },
]
```

### 2. Supply Data Pattern
AI nodes (like BitNet, OpenAI, etc.) implement a `supplyData` method that returns an object with an `invoke` function:
```typescript
async supplyData(): Promise<any> {
  return {
    invoke: async (params) => {
      // Make API call to AI service
      // Return response
    }
  };
}
```

### 3. Consuming the Model
The Hierarchical Summarization node now correctly:
1. Calls `getInputConnectionData` with the AI model connection type
2. Receives the object with the `invoke` method
3. Calls `invoke` with messages and options
4. Parses the response using the existing `parseAIResponse` function

## Testing the Fix

To test the fix:

1. Create a new workflow in n8n
2. Add a Hierarchical Summarization node
3. Connect an AI Language Model node (BitNet, OpenAI, etc.) to the Language Model input
4. Connect data input (documents to summarize) to the main input
5. Configure the database connection
6. Run the workflow

The node should now properly use the connected AI model to generate summaries.

## Benefits

1. **Simpler Code**: Removed ~30 lines of complex fallback logic
2. **Standard Pattern**: Follows n8n's intended design for AI model connections
3. **Better Error Messages**: Clear message when no model is connected
4. **Compatibility**: Works with any n8n AI model node that implements the supply data pattern

## Supported AI Models

Any n8n node that provides AI language model connections should work, including:
- BitNet
- OpenAI (GPT-3.5, GPT-4)
- Anthropic (Claude)
- Google AI (Gemini)
- Cohere
- Hugging Face
- Local AI models via Ollama
- And any other nodes that implement the AI Language Model connection type