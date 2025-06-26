# n8n Custom AI Node → AI Agent Compatibility Manual

## Required Modifications (June 2025)

To modify your existing custom AI node to work with the AI Agent node in n8n, these conditions MUST be met:

### 1. **REMOVE ALL INPUTS**
```typescript
// ❌ WRONG - Chat models cannot have inputs
inputs: [NodeConnectionType.Main],
inputs: [{type: NodeConnectionType.AiLanguageModel, ...}],

// ✅ CORRECT - Must be empty
inputs: [],
```

### 2. **ADD CORRECT OUTPUT TYPE**
```typescript
// ❌ WRONG - Regular outputs won't connect
outputs: [NodeConnectionType.Main],

// ✅ CORRECT - Exact type required
outputs: [NodeConnectionType.AiLanguageModel],
outputNames: ['Model'],
```

### 3. **IMPLEMENT supplyData METHOD**
```typescript
// ❌ WRONG - execute() method for regular nodes
async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {

// ✅ CORRECT - Must use supplyData for sub-nodes
async supplyData(this: IExecuteFunctions, itemIndex: number): Promise<SupplyData> {
    // Must return { response: <LangChain Model> }
}
```

### 4. **RETURN LANGCHAIN MODEL INSTANCE**
```typescript
// ❌ WRONG - Returning raw data or custom objects
return { response: { chat: async () => {...} } };
return model;  // Missing wrapper object
return { data: model };  // Wrong property name

// ✅ CORRECT - Must wrap in response property
const { ChatOpenAI } = await import('@langchain/openai');
const model = new ChatOpenAI({...});
return { response: model };
```

## Common Mistakes & Errors

### Mistake 1: "Node does not have a supplyData method"
**Cause**: Using `execute()` instead of `supplyData()`
- Sub-nodes (chat models) don't process data, they supply it
- 'Node does not have a supplyData method'

### Mistake 2: AI Model Auto-Connects to Wrong Nodes
**Cause**: Adding AiLanguageModel as an INPUT
- whenever I attach an AI Language model to my node, it automatically gets attached to the Basic LLM Chain and the Chat Trigger Node
- Chat models OUTPUT to AI Agent, not receive input

### Mistake 3: Expression Resolution Issues
**Cause**: Expecting multi-item processing
- In sub-nodes, the expression always resolves to the first item
- Sub-nodes only process itemIndex parameter, not arrays

### Mistake 4: Not Using LangChain Classes
**Cause**: Custom implementations without LangChain
- Must use `@langchain/openai`, `@langchain/core`, etc.
- AI Agent expects LangChain's `BaseChatModel` interface

## Minimal Fix Template

```typescript
// Convert existing node to AI Agent compatible
export class YourCustomAI implements INodeType {
    description: INodeTypeDescription = {
        // ... existing properties ...
        
        // REQUIRED CHANGES:
        inputs: [],  // Must be empty
        outputs: [NodeConnectionType.AiLanguageModel],
        outputNames: ['Model'],
    };

    // REPLACE execute() WITH:
    async supplyData(
        this: IExecuteFunctions, 
        itemIndex: number
    ): Promise<SupplyData> {
        const apiKey = this.getNodeParameter('apiKey', itemIndex) as string;
        
        // Import LangChain
        const { ChatOpenAI } = await import('@langchain/openai');
        
        // Create and return model
        return {
            response: new ChatOpenAI({
                openAIApiKey: apiKey,
                // ... your config
            })
        };
    }
}
```

## Verification Checklist
- [ ] Node appears under AI > Chat Models (not in regular nodes)
- [ ] Can connect to AI Agent's "Chat Model" slot
- [ ] No "supplyData method" errors
- [ ] AI Agent receives responses correctly
