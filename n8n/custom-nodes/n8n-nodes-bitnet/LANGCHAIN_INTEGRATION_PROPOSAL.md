# BitNet LangChain Integration Proposal

## Current Limitation
The BitNet node cannot appear in the AI Agent dropdown because:
1. Only nodes in the `@n8n/n8n-nodes-langchain` package appear there
2. This package is built into n8n core, not separately installable
3. LangChain nodes use the LangChain library, not direct API implementations

## Solution Options

### Option 1: Create BitNet LangChain Provider (Recommended)
Create a proper LangChain chat model provider for BitNet that can be integrated into n8n-nodes-langchain.

**Steps:**
1. Create a BitNet provider for LangChain (similar to `@langchain/openai`)
2. Submit PR to n8n to add BitNet to n8n-nodes-langchain
3. Node would then appear in AI Agent dropdown

**Pros:**
- Native integration with AI Agents
- Full LangChain ecosystem compatibility
- Official support

**Cons:**
- Requires upstream acceptance
- More complex implementation
- Longer timeline

### Option 2: Custom n8n Build
Fork n8n and add BitNet to the langchain nodes directly.

**Steps:**
1. Fork n8n repository
2. Add BitNet to `packages/@n8n/nodes-langchain/nodes/llms/`
3. Build and maintain custom n8n image

**Pros:**
- Full control over integration
- Immediate availability

**Cons:**
- Maintenance burden
- Diverges from official n8n
- Update complexity

### Option 3: Current Approach (Works Today)
Use BitNet as a separate node connected to AI Agents.

**Usage:**
```
[Chat Trigger] → [AI Agent] → [Response]
                      ↓
                [BitNet Node]
```

**Pros:**
- Works immediately
- No upstream dependencies
- Maintains compatibility

**Cons:**
- Not in dropdown menu
- Requires manual connection

## Implementation Example for Option 1

Here's how a LangChain-compatible BitNet implementation would look:

```typescript
// BitNetChatModel.ts
import { ChatOpenAI } from "@langchain/openai";
import { BaseChatModelParams } from "@langchain/core/language_models/chat_models";

export interface BitNetChatModelParams extends BaseChatModelParams {
  modelName?: string;
  temperature?: number;
  maxTokens?: number;
  bitnetUrl?: string;
}

export class BitNetChatModel extends ChatOpenAI {
  constructor(params: BitNetChatModelParams) {
    super({
      ...params,
      openAIApiKey: "dummy", // BitNet doesn't need API key
      configuration: {
        baseURL: params.bitnetUrl || "http://localhost:8080",
      },
    });
  }
}
```

Then in n8n-nodes-langchain:

```typescript
// LmChatBitNet.node.ts
export class LmChatBitNet implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'BitNet Chat Model',
    name: 'lmChatBitNet',
    icon: 'file:bitnet.svg',
    group: ['transform'],
    version: 1,
    description: 'Use BitNet 1-bit LLM with AI Agents',
    defaults: {
      name: 'BitNet Chat Model',
    },
    codex: {
      categories: ['AI'],
      subcategories: {
        AI: ['Language Models'],
        'Language Models': ['Chat Models (Recommended)'],
      },
    },
    inputs: [],
    outputs: [NodeConnectionTypes.AiLanguageModel],
    outputNames: ['Model'],
    properties: [
      // BitNet-specific properties
    ],
  };

  async supplyData(this: ISupplyDataFunctions): Promise<SupplyData> {
    const model = new BitNetChatModel({
      bitnetUrl: this.getNodeParameter('serverUrl', 0) as string,
      modelName: this.getNodeParameter('model', 0) as string,
      temperature: this.getNodeParameter('temperature', 0) as number,
    });

    return {
      response: model,
    };
  }
}
```

## Recommendation

For immediate use, the current approach (Option 3) works well. For long-term integration, Option 1 (creating a proper LangChain provider) would be the best approach, as it would allow BitNet to be officially supported in n8n's AI Agent system.

The key insight is that n8n's AI Agent system is built on LangChain, so proper integration requires working within the LangChain ecosystem rather than just implementing the n8n node interface.