# Middle Ground Solutions for BitNet AI Agent Integration

You're correct - the AI Agent nodes only work with LangChain-compatible models. Here are some "in between" approaches that don't require forking n8n or waiting for official support:

## Option 1: Runtime Injection via Docker Volumes (Recommended)

We can inject BitNet into the langchain nodes at container startup without modifying the n8n image.

### Implementation Steps:

1. **Create a LangChain-compatible BitNet node**:

```typescript
// LmChatBitNet.node.ts
import { INodeType, INodeTypeDescription, ISupplyDataFunctions, SupplyData, NodeConnectionTypes } from 'n8n-workflow';
import { ChatOpenAI } from '@langchain/openai';

export class LmChatBitNet implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'BitNet Chat Model',
    name: 'lmChatBitNet',
    icon: 'file:bitnet.svg',
    group: ['transform'],
    version: 1,
    description: 'Use BitNet with AI Agents',
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
      {
        displayName: 'Connect an AI Agent or Chain node to use this model',
        name: 'notice',
        type: 'notice',
        default: '',
      },
      {
        displayName: 'Server URL',
        name: 'serverUrl',
        type: 'string',
        default: 'http://localhost:8080',
        description: 'BitNet server URL',
      },
      {
        displayName: 'Model',
        name: 'model',
        type: 'string',
        default: 'bitnet-b1.58-3b',
      },
      {
        displayName: 'Temperature',
        name: 'temperature',
        type: 'number',
        default: 0.7,
        typeOptions: {
          minValue: 0,
          maxValue: 2,
        },
      },
    ],
  };

  async supplyData(this: ISupplyDataFunctions): Promise<SupplyData> {
    const credentials = { apiKey: 'dummy' }; // BitNet doesn't need API key
    const serverUrl = this.getNodeParameter('serverUrl', 0) as string;
    const modelName = this.getNodeParameter('model', 0) as string;
    const temperature = this.getNodeParameter('temperature', 0) as number;

    // Use ChatOpenAI as base since BitNet has OpenAI-compatible API
    const model = new ChatOpenAI({
      openAIApiKey: 'dummy',
      modelName,
      temperature,
      configuration: {
        baseURL: serverUrl + '/v1',
      },
    });

    return {
      response: model,
    };
  }
}
```

2. **Create injection script**:

```bash
#!/bin/bash
# inject-bitnet.sh

# Build the BitNet langchain node
cd /home/manzanita/coding/data-compose/n8n/custom-nodes/n8n-nodes-bitnet-langchain
npm run build

# Copy to n8n container
docker cp dist/nodes/llms/LmChatBitNet data-compose-n8n-1:/usr/local/lib/node_modules/n8n/node_modules/@n8n/n8n-nodes-langchain/dist/nodes/llms/

# Update package.json to include BitNet
docker exec data-compose-n8n-1 sh -c "cd /usr/local/lib/node_modules/n8n/node_modules/@n8n/n8n-nodes-langchain && \
  cp package.json package.json.bak && \
  jq '.n8n.nodes += [\"dist/nodes/llms/LmChatBitNet/LmChatBitNet.node.js\"]' package.json > package.json.tmp && \
  mv package.json.tmp package.json"

# Restart n8n
docker-compose restart n8n
```

3. **Automate with Docker Compose override**:

```yaml
# docker-compose.override.yml
services:
  n8n:
    volumes:
      - ./n8n/custom-nodes/n8n-nodes-bitnet-langchain/dist/nodes/llms/LmChatBitNet:/usr/local/lib/node_modules/n8n/node_modules/@n8n/n8n-nodes-langchain/dist/nodes/llms/LmChatBitNet:ro
    command: >
      sh -c "
        # Update package.json if BitNet not already added
        if ! grep -q 'LmChatBitNet' /usr/local/lib/node_modules/n8n/node_modules/@n8n/n8n-nodes-langchain/package.json; then
          cd /usr/local/lib/node_modules/n8n/node_modules/@n8n/n8n-nodes-langchain &&
          cp package.json package.json.bak &&
          sed -i '/"dist\/nodes\/llms\/.*\.js"/a\      "dist/nodes/llms/LmChatBitNet/LmChatBitNet.node.js",' package.json
        fi &&
        # Start n8n normally
        tini -- /docker-entrypoint.sh
      "
```

## Option 2: Custom Proxy Node

Create a node that acts as a bridge between n8n and LangChain:

```typescript
// BitNetLangChainProxy.node.ts
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { BaseMessage, AIMessage } from '@langchain/core/messages';

class BitNetLangChainProxy extends BaseChatModel {
  private serverUrl: string;
  private model: string;

  constructor(fields: { serverUrl: string; model: string }) {
    super(fields);
    this.serverUrl = fields.serverUrl;
    this.model = fields.model;
  }

  async _call(messages: BaseMessage[]): Promise<string> {
    // Convert to BitNet API format and call
    const response = await fetch(`${this.serverUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        messages: messages.map(m => ({
          role: m._getType(),
          content: m.content,
        })),
      }),
    });
    
    const data = await response.json();
    return data.choices[0].message.content;
  }

  _llmType(): string {
    return 'bitnet';
  }
}
```

## Option 3: Build Custom n8n Docker Image

Create a Dockerfile that adds BitNet during build:

```dockerfile
# Dockerfile.custom
FROM n8nio/n8n:latest

# Copy BitNet langchain node
COPY ./n8n-nodes-bitnet-langchain/dist /tmp/bitnet-langchain

# Inject into n8n-nodes-langchain
RUN cd /usr/local/lib/node_modules/n8n/node_modules/@n8n/n8n-nodes-langchain && \
    cp -r /tmp/bitnet-langchain/nodes/llms/LmChatBitNet dist/nodes/llms/ && \
    # Update package.json
    jq '.n8n.nodes += ["dist/nodes/llms/LmChatBitNet/LmChatBitNet.node.js"]' package.json > package.json.tmp && \
    mv package.json.tmp package.json
```

Then in docker-compose.yml:
```yaml
n8n:
  build:
    context: .
    dockerfile: Dockerfile.custom
```

## Option 4: Development Mode with Symlinks

For development, you can symlink your BitNet langchain node:

```bash
# Start n8n in development mode
docker exec -it data-compose-n8n-1 sh

# Create symlink
ln -s /home/node/.n8n/custom/bitnet-langchain/dist/nodes/llms/LmChatBitNet \
      /usr/local/lib/node_modules/n8n/node_modules/@n8n/n8n-nodes-langchain/dist/nodes/llms/LmChatBitNet

# Edit package.json to include the new node
```

## Recommendation

Option 1 (Runtime Injection) is the most maintainable middle ground because:
- No need to maintain a fork
- Survives n8n updates (with minor adjustments)
- Can be automated in docker-compose
- Easy to remove if official support is added

The key is that BitNet must implement the LangChain `BaseChatModel` interface, not just the n8n node interface. Since BitNet has an OpenAI-compatible API, we can leverage the existing `ChatOpenAI` class as a base.