# n8n AI Model Connection Guide

This document describes how to create custom nodes that integrate with n8n's standard AI model connection system, allowing nodes to either provide AI capabilities or consume them through a unified interface.

## Overview

n8n provides a standardized way for nodes to connect with AI language models through the `NodeConnectionType.AiLanguageModel` connection type. This enables:

- AI provider nodes (like OpenAI, Anthropic) to expose their models
- Consumer nodes to use any connected AI model without provider-specific code
- Consistent interface across different AI providers

## For AI Provider Nodes

Nodes that provide AI model capabilities must implement the `supplyData` method:

### Basic Implementation

```typescript
import { ISupplyDataFunctions, SupplyData } from 'n8n-workflow';

async supplyData(this: ISupplyDataFunctions): Promise<SupplyData> {
  return {
    invoke: async (params: {
      messages: Array<{role: string, content: string}>,
      options?: {
        temperature?: number,
        maxTokensToSample?: number,
        stopSequences?: string[],
        [key: string]: any
      }
    }) => {
      // Implement AI model invocation
      const response = await callYourAIModel(params);
      
      // Return standardized response
      return {
        text: response.content,
        usage: {
          inputTokens: response.usage?.prompt_tokens,
          outputTokens: response.usage?.completion_tokens,
        }
      };
    }
  };
}
```

### Output Configuration

```typescript
outputs: [
  {
    displayName: 'Model',
    name: 'model',
    type: NodeConnectionType.AiLanguageModel,
  }
],
```

### LangChain Compatibility (Optional)

For compatibility with LangChain-based nodes:

```typescript
async supplyData(this: ISupplyDataFunctions): Promise<SupplyData> {
  const model = {
    // Your model implementation
    invoke: async (params) => { /* ... */ }
  };
  
  return {
    response: model,  // For LangChain compatibility
    invoke: model.invoke  // For standard n8n compatibility
  };
}
```

## For AI Consumer Nodes

Nodes that use AI models should define an AI model input:

### Input Configuration

```typescript
inputs: [
  {
    displayName: 'Model',
    name: 'model',
    type: NodeConnectionType.AiLanguageModel,
    required: true,
    description: 'The language model to use for processing',
  }
],
```

### Using the Connected Model

```typescript
async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
  // Get the connected AI model
  const languageModel = await this.getInputConnectionData(
    NodeConnectionType.AiLanguageModel,
    0
  ) as { invoke: Function };

  // Validate the model
  if (!languageModel || typeof languageModel.invoke !== 'function') {
    throw new NodeOperationError(
      this.getNode(),
      'No AI language model connected. Please connect an AI model node.'
    );
  }

  // Use the model
  const response = await languageModel.invoke({
    messages: [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'Process this text...' }
    ],
    options: {
      temperature: 0.7,
      maxTokensToSample: 1000
    }
  });

  // Handle the response
  const text = response.text || response.content || response.choices?.[0]?.message?.content;
  
  return this.prepareOutputData([{ json: { result: text } }]);
}
```

## Response Format Handling

Different AI providers return responses in various formats. Handle them flexibly:

```typescript
function parseAIResponse(response: any): string {
  // Handle different response formats
  if (typeof response === 'string') return response;
  if (response.text) return response.text;
  if (response.content) return response.content;
  if (response.choices?.[0]?.message?.content) {
    return response.choices[0].message.content;
  }
  if (response.generations?.[0]?.[0]?.text) {
    return response.generations[0][0].text;
  }
  
  throw new Error('Unable to parse AI response');
}
```

## Error Handling

Use proper error handling with clear messages:

```typescript
try {
  const response = await languageModel.invoke(params);
  // Process response
} catch (error) {
  if (this.continueOnFail()) {
    return this.prepareOutputData([{
      json: { 
        error: error.message,
        result: 'Failed to process with AI model'
      },
      pairedItem: { item: i }
    }]);
  }
  
  throw new NodeOperationError(
    this.getNode(),
    `AI model error: ${error.message}`,
    { itemIndex: i }
  );
}
```

## Testing

### Mock AI Model for Testing

```typescript
const mockLanguageModel = {
  invoke: async (params) => ({
    text: `Mocked response for: ${params.messages.slice(-1)[0].content}`,
    usage: { inputTokens: 10, outputTokens: 20 }
  })
};
```

### Unit Test Example

```typescript
it('should process text with AI model', async () => {
  const executeFunctions = createMockExecuteFunctions({
    inputConnectionData: mockLanguageModel
  });
  
  const result = await node.execute.call(executeFunctions);
  expect(result[0][0].json.result).toBe('Mocked response for: test input');
});
```

## Best Practices

1. **Always validate** the AI model connection before use
2. **Handle multiple response formats** from different providers
3. **Provide clear error messages** when no model is connected
4. **Support both standalone and AI-connected modes** when appropriate
5. **Use TypeScript** for better type safety
6. **Include usage statistics** in responses when available
7. **Support streaming responses** for real-time output (if applicable)

## Common Issues

### Issue: "No AI language model connected"
- Ensure an AI model node is connected to the input
- Verify the input type is `NodeConnectionType.AiLanguageModel`

### Issue: Response parsing errors
- Different AI providers return different formats
- Use flexible parsing to handle various response structures

### Issue: TypeScript errors
- Import types from `n8n-workflow` package
- Ensure your `tsconfig.json` includes n8n type definitions

## Example Implementations

- **MinimalAIModel.node.ts**: Basic AI provider implementation
- **BitNet.node.ts**: Production example with LangChain compatibility
- **HierarchicalSummarization.node.ts**: Consumer node using AI models

## Additional Resources

- [n8n AI Nodes Documentation](https://docs.n8n.io/integrations/ai/)
- [Creating Custom Nodes](https://docs.n8n.io/integrations/creating-nodes/)
- [NodeConnectionType Reference](https://docs.n8n.io/reference/typescript-api/)