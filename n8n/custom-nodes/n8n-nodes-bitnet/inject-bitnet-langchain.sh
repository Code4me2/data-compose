#!/bin/bash
# Script to inject BitNet into n8n's langchain nodes at runtime

echo "Injecting BitNet into n8n langchain nodes..."

# First, let's create a minimal LangChain-compatible BitNet node
cat > /tmp/LmChatBitNet.node.js << 'EOF'
"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var LmChatBitNet_node_exports = {};
__export(LmChatBitNet_node_exports, {
  LmChatBitNet: () => LmChatBitNet
});
module.exports = __toCommonJS(LmChatBitNet_node_exports);
var import_openai = require("@langchain/openai");
var import_n8n_workflow = require("n8n-workflow");

class LmChatBitNet {
  constructor() {
    this.description = {
      displayName: "BitNet Chat Model",
      name: "lmChatBitNet",
      icon: "file:bitnet.svg",
      group: ["transform"],
      version: [1],
      description: "Use BitNet 1-bit LLM with AI Agents",
      defaults: {
        name: "BitNet Chat Model"
      },
      codex: {
        categories: ["AI"],
        subcategories: {
          AI: ["Language Models"],
          "Language Models": ["Chat Models (Recommended)"]
        }
      },
      inputs: [],
      outputs: [import_n8n_workflow.NodeConnectionTypes.AiLanguageModel],
      outputNames: ["Model"],
      properties: [
        {
          displayName: 'Connect an AI Agent or Chain node to use this model',
          name: 'notice',
          type: 'notice',
          default: ''
        },
        {
          displayName: "BitNet Server URL",
          name: "serverUrl",
          type: "string",
          default: "http://host.docker.internal:8080",
          description: "URL of the BitNet server"
        },
        {
          displayName: "Model",
          name: "model",
          type: "string",
          default: "bitnet-b1.58-3b",
          description: "BitNet model to use"
        },
        {
          displayName: "Temperature",
          name: "temperature",
          type: "number",
          default: 0.7,
          typeOptions: {
            minValue: 0,
            maxValue: 2,
            numberPrecision: 2
          }
        },
        {
          displayName: "Max Tokens",
          name: "maxTokens",
          type: "number",
          default: 512,
          description: "Maximum tokens to generate"
        }
      ]
    };
  }

  async supplyData(executeFunctions, itemIndex) {
    const serverUrl = executeFunctions.getNodeParameter('serverUrl', itemIndex);
    const modelName = executeFunctions.getNodeParameter('model', itemIndex);
    const temperature = executeFunctions.getNodeParameter('temperature', itemIndex);
    const maxTokens = executeFunctions.getNodeParameter('maxTokens', itemIndex);

    // Use ChatOpenAI with BitNet's OpenAI-compatible endpoint
    const model = new import_openai.ChatOpenAI({
      openAIApiKey: 'dummy-key-for-bitnet',
      modelName: modelName,
      temperature: temperature,
      maxTokens: maxTokens,
      configuration: {
        baseURL: serverUrl + '/v1',
      },
    });

    return {
      response: model,
    };
  }
}

exports.LmChatBitNet = LmChatBitNet;
EOF

# Copy BitNet icon if it exists
if [ -f "nodes/BitNet/bitnet.svg" ]; then
  docker cp nodes/BitNet/bitnet.svg data-compose-n8n-1:/tmp/bitnet.svg
fi

# Copy files to container
docker cp /tmp/LmChatBitNet.node.js data-compose-n8n-1:/tmp/

# Create the injection script inside the container
docker exec data-compose-n8n-1 sh -c 'cat > /tmp/inject.sh << "SCRIPT"
#!/bin/sh
LANGCHAIN_DIR="/usr/local/lib/node_modules/n8n/node_modules/@n8n/n8n-nodes-langchain"

# Create BitNet directory
mkdir -p "$LANGCHAIN_DIR/dist/nodes/llms/LmChatBitNet"

# Copy node file
cp /tmp/LmChatBitNet.node.js "$LANGCHAIN_DIR/dist/nodes/llms/LmChatBitNet/"

# Copy icon if exists
if [ -f /tmp/bitnet.svg ]; then
  cp /tmp/bitnet.svg "$LANGCHAIN_DIR/dist/nodes/llms/LmChatBitNet/"
fi

# Backup package.json
cp "$LANGCHAIN_DIR/package.json" "$LANGCHAIN_DIR/package.json.backup"

# Add BitNet to the nodes list in package.json
cd "$LANGCHAIN_DIR"
jq ".n8n.nodes |= . + [\"dist/nodes/llms/LmChatBitNet/LmChatBitNet.node.js\"] | .n8n.nodes |= unique" package.json > package.json.tmp && mv package.json.tmp package.json

echo "BitNet injection complete!"
SCRIPT'

# Make script executable and run it
docker exec data-compose-n8n-1 chmod +x /tmp/inject.sh
docker exec data-compose-n8n-1 /tmp/inject.sh

echo "Restarting n8n to load BitNet..."
docker-compose restart n8n

echo "Done! BitNet should now appear in the AI Agent language model dropdown."