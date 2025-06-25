I'll search for the current n8n AI node protocol requirements to help you resolve this integration issue.Based on my research, here's the specific protocol and requirements for custom nodes to communicate with n8n's default AI nodes:

## Key Requirements for Custom Node AI Tool Integration

### 1. **Enable Tool Usage Flag**
Your custom node must include the property `usableAsTool: true` in the node definition. This flag tells n8n that the node can be used as a tool by AI agents.

### 2. **Environment Variable**
You must set the environment variable `N8N_COMMUNITY_PACKAGES_ALLOW_TOOL_USAGE=true` to allow community nodes to be used as tools by AI agents.

### 3. **Data Structure Format**
The critical protocol requirement is that your custom node must follow n8n's standard data structure:

Data sent from one node to another is sent as an array of JSON objects. The elements in this collection are called items. n8n expects you to wrap each object in an array in another object, with the key json.

The expected format is:
```javascript
[
  {
    json: {
      // Your actual data here
      key1: "value1",
      key2: "value2"
    }
  },
  {
    json: {
      // Another item
      key1: "value3",
      key2: "value4"
    }
  }
]
```

### 4. **Execute Function Return Type**
Your custom node's `execute` function must return data in the `INodeExecutionData[][]` format. The execute function should return `Promise<INodeExecutionData[][]>`.

### 5. **Tool Description**
Provide a clear description that tells the agent when to use this tool. This helps the AI agent understand the tool's purpose and capabilities.

## Example Implementation Pattern

Based on the research, here's a basic structure for a custom node that works as an AI tool:

```typescript
import { IExecuteFunctions } from 'n8n-core';
import { 
  INodeExecutionData, 
  INodeType, 
  INodeTypeDescription 
} from 'n8n-workflow';

export class MyCustomTool implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'My Custom Tool',
    name: 'myCustomTool',
    group: ['transform'],
    version: 1,
    description: 'Clear description for AI agent',
    usableAsTool: true, // Critical flag
    defaults: {
      name: 'My Custom Tool',
    },
    inputs: ['main'],
    outputs: ['main'],
    // ... other properties
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];

    // Process each item
    for (let i = 0; i < items.length; i++) {
      // Your processing logic here
      const newItem = {
        json: {
          // Your output data
          result: 'processed data'
        }
      };
      returnData.push(newItem);
    }

    // Return in the expected format
    return this.prepareOutputData(returnData);
  }
}
```

## Troubleshooting Tips

1. From version 0.166.0 on, when using the Function node or Code node, n8n automatically adds the json key if it's missing, but custom nodes must still ensure proper formatting.

2. If you see errors like "Unrecognized node type", ensure your node is properly registered and the `usableAsTool` flag is set correctly.

3. The Tools Agent implements Langchain's tool calling interface, so your node should be compatible with this standard.

The key issue preventing your custom nodes from working with default AI nodes is likely the missing `usableAsTool: true` flag, the environment variable not being set, or the output data not following the exact `INodeExecutionData` structure that n8n expects.
