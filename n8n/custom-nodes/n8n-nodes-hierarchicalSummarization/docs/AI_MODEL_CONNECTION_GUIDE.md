# n8n AI Model Connection Guide

This guide explains how to properly implement and use AI Language Model connections in n8n custom nodes.

## Overview

n8n uses a "supply data" pattern for AI Language Model connections, where:
1. AI provider nodes (BitNet, OpenAI, etc.) supply a model interface
2. Consumer nodes (like Hierarchical Summarization) use the model via a standardized API
3. The connection is established through n8n's workflow editor

## For AI Model Provider Nodes

### 1. Node Configuration

```typescript
export class MyAIModel implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'My AI Model',
    name: 'myAiModel',
    group: ['ai', 'languageModel'],
    version: 1,
    description: 'Provides AI language model capabilities',
    defaults: {
      name: 'My AI Model',
    },
    // Important: AI models usually have main input and AI model output
    inputs: [NodeConnectionType.Main],
    outputs: [
      NodeConnectionType.Main,
      {
        type: NodeConnectionType.AiLanguageModel,
        displayName: 'Model'
      }
    ],
    // ... properties for configuration
  };
```

### 2. Implement supplyData Method

```typescript
async supplyData(this: ISupplyDataFunctions): Promise<any> {
  // Get configuration from node parameters
  const apiKey = this.getNodeParameter('apiKey', 0) as string;
  const model = this.getNodeParameter('model', 0) as string;
  
  // Return object with invoke function
  return {
    invoke: async (params: {
      messages: Array<{role: string, content: string}>,
      options?: {
        temperature?: number,
        maxTokensToSample?: number,
        [key: string]: any
      }
    }) => {
      const { messages, options = {} } = params;
      
      // Make API call to your AI service
      const response = await this.helpers.httpRequest({
        method: 'POST',
        url: 'https://api.myaiservice.com/v1/chat',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: {
          model,
          messages,
          temperature: options.temperature ?? 0.7,
          max_tokens: options.maxTokensToSample ?? 512,
          // ... other parameters
        },
        json: true,
      });
      
      // Return response in a consistent format
      // n8n's AI nodes typically return OpenAI-like format
      return {
        choices: [{
          message: {
            content: response.text || response.content || ''
          }
        }]
      };
    }
  };
}
```

## For Consumer Nodes

### 1. Node Configuration

```typescript
export class MyConsumerNode implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'My Consumer Node',
    name: 'myConsumerNode',
    version: 1,
    description: 'Uses AI language model for processing',
    defaults: {
      name: 'My Consumer Node',
    },
    // Define AI model input
    inputs: [
      NodeConnectionType.Main,
      {
        type: NodeConnectionType.AiLanguageModel,
        required: true,
        displayName: 'Language Model',
        maxConnections: 1,
      },
    ],
    outputs: [NodeConnectionType.Main],
    // ... properties
  };
```

### 2. Use the AI Model

```typescript
async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
  const items = this.getInputData();
  const returnData: INodeExecutionData[] = [];
  
  for (let i = 0; i < items.length; i++) {
    try {
      // Get the AI model connection
      const languageModel = await this.getInputConnectionData(
        NodeConnectionType.AiLanguageModel,
        0 // Index 0 for first (usually only) AI connection
      );
      
      // Verify the model is properly connected
      if (!languageModel || typeof languageModel.invoke !== 'function') {
        throw new NodeOperationError(
          this.getNode(),
          'No AI language model connected. Please connect an AI model node.',
          { itemIndex: i }
        );
      }
      
      // Use the model
      const response = await languageModel.invoke({
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'Hello, how are you?' }
        ],
        options: {
          temperature: 0.7,
          maxTokensToSample: 150,
        }
      });
      
      // Parse response (handle different formats)
      const content = response.choices?.[0]?.message?.content || 
                     response.text || 
                     response.content || 
                     '';
      
      returnData.push({
        json: { response: content },
        pairedItem: { item: i }
      });
      
    } catch (error) {
      if (this.continueOnFail()) {
        returnData.push({
          json: { error: error.message },
          pairedItem: { item: i }
        });
        continue;
      }
      throw error;
    }
  }
  
  return [returnData];
}
```

## Common Response Formats

Different AI providers return responses in different formats. Here's a helper function to parse them:

```typescript
function parseAIResponse(response: any): string {
  if (!response) return '';
  
  // Direct string response
  if (typeof response === 'string') return response;
  
  // OpenAI/Anthropic format
  if (response.choices?.[0]?.message?.content) {
    return response.choices[0].message.content;
  }
  
  // Alternative formats
  const content = response.content || 
                 response.text || 
                 response.output || 
                 response.result ||
                 response.completion ||
                 response.response ||
                 '';
                 
  return String(content);
}
```

## Testing AI Connections

### 1. Unit Testing

```javascript
// Mock AI model for testing
const mockAIModel = {
  invoke: async (params) => {
    return {
      choices: [{
        message: {
          content: `Mocked response for: ${params.messages[0].content}`
        }
      }]
    };
  }
};

// Test your consumer node with mock
const executeFunctions = {
  getInputConnectionData: async (type, index) => {
    if (type === NodeConnectionType.AiLanguageModel) {
      return mockAIModel;
    }
    return null;
  },
  // ... other required methods
};
```

### 2. Integration Testing in n8n

1. Create a test workflow
2. Add your AI model node (e.g., BitNet, OpenAI)
3. Add your consumer node
4. Connect the AI model's "Model" output to your consumer's "Language Model" input
5. Connect test data to the main input
6. Execute and verify results

## Troubleshooting

### Common Issues

1. **"No language model connected" error**
   - Ensure AI model node is connected to the Language Model input
   - Verify the AI model node has a Model output
   - Check that the AI model's supplyData returns an object with invoke function

2. **"invoke is not a function" error**
   - The AI model's supplyData must return `{ invoke: async function }`
   - Check for typos in the function name

3. **Empty responses**
   - Use the parseAIResponse helper to handle different formats
   - Add logging to see the actual response structure
   - Verify the AI service is returning data

### Debug Logging

Add this to your consumer node for debugging:

```typescript
const languageModel = await this.getInputConnectionData(
  NodeConnectionType.AiLanguageModel,
  0
);

console.log('AI Model Debug:', {
  connected: !!languageModel,
  hasInvoke: typeof languageModel?.invoke === 'function',
  keys: languageModel ? Object.keys(languageModel) : []
});
```

## Best Practices

1. **Always validate the connection** before using it
2. **Handle different response formats** - AI providers vary
3. **Provide clear error messages** when connection fails
4. **Use TypeScript interfaces** for better type safety
5. **Implement proper error handling** with itemIndex for better UX
6. **Test with multiple AI providers** to ensure compatibility

## Example Nodes

### AI Provider Examples
- BitNet (`n8n-nodes-bitnet`)
- OpenAI (built-in n8n)
- Anthropic (built-in n8n)
- Google AI (built-in n8n)

### Consumer Examples
- Hierarchical Summarization (`n8n-nodes-hierarchicalSummarization`)
- AI Agent nodes (built-in n8n)
- Custom processing nodes