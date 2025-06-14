# n8n-nodes-bitnet

This is an n8n community node that provides integration with BitNet 1-bit LLMs for efficient inference, with special support for recursive document summarization.

## Quick Start (Tested Setup)

1. **Start BitNet Server** (runs on port 8081):
   ```bash
   cd /home/manzanita/coding/bitnet-inference/BitNet
   ./build/bin/llama-server -m models/BitNet-b1.58-2B-4T/ggml-model-i2_s.gguf --host 0.0.0.0 --port 8081
   ```

2. **Start n8n with Docker**:
   ```bash
   cd /home/manzanita/coding/data-compose
   docker compose up -d
   ```

3. **Configure BitNet Node in n8n**:
   - Operation: Chat Completion
   - Server Mode: External Server  
   - Server URL: `http://host.docker.internal:8081`
   - Messages: Type your message directly (e.g., "Hello!")

4. **Access Services**:
   - n8n Interface: http://localhost:5678
   - Web Interface: http://localhost:8080
   - BitNet API: http://localhost:8081

## Features

- **Dual Server Modes**: 
  - External: Connect to existing BitNet server
  - Managed: Auto-start and manage BitNet server lifecycle
- **7 Operations**: 
  - Text Completion
  - Chat Completion (OpenAI-compatible)
  - **Recursive Summary** (hierarchical text summarization)
  - Generate Embeddings
  - Tokenize
  - Health Check
  - **Server Control** (start/stop/restart/status)
- **Advanced Features**:
  - Thinking/reasoning extraction from model outputs
  - Streaming support
  - Smart text chunking with overlap
  - Multi-level recursive summarization
  - Token estimation and management

## Installation

### Prerequisites

1. Ensure BitNet is built and installed:
   ```bash
   cd /path/to/bitnet-inference/BitNet
   python setup_env.py
   ```

2. Build the n8n node:
   ```bash
   cd n8n/custom-nodes/n8n-nodes-bitnet
   npm install
   npm run build
   ```

3. Restart n8n to load the node.

### Quick Setup

Run the provided setup script:
```bash
./setup-bitnet.sh
```

This will:
- Verify BitNet installation
- Check for required binaries
- Install dependencies
- Build the node
- Create configuration templates

## Configuration

### Server Modes

#### 1. External Server Mode (default)
Connect to an existing BitNet server running elsewhere.

**Parameters:**
- `serverUrl`: URL of the BitNet server (default: `http://localhost:8080`)

#### 2. Managed Server Mode
Let the node automatically start and manage a BitNet server.

**Parameters:**
- `bitnetPath`: Path to BitNet installation (default: `/home/manzanita/coding/bitnet-inference/BitNet`)
- `serverPort`: Port for the managed server (default: `8080`)

### Available Models

The node includes presets for official BitNet models:
- **BitNet b1.58 2B**: `models/BitNet-b1.58-2B-4T/ggml-model-i2_s.gguf`
- **BitNet b1.58 3B**: `models/bitnet_b1_58-3B/ggml-model.gguf`
- **BitNet b1.58 Large**: `models/bitnet_b1_58-large/ggml-model.gguf`
- **Custom Model**: Specify your own model path

### Docker Deployment

Use the provided Docker Compose configuration:

```bash
# Set environment variables
export BITNET_PATH=/path/to/BitNet
export BITNET_MODEL=/models/BitNet-b1.58-2B-4T/ggml-model-i2_s.gguf

# Start BitNet server
docker-compose -f docker-compose.bitnet.yml up -d

# Download models (optional)
docker-compose -f docker-compose.bitnet.yml --profile download-models up

# Check logs
docker-compose -f docker-compose.bitnet.yml logs -f bitnet
```

## Operations

### 1. Text Completion
Generate text completions from prompts.

**Parameters:**
- `prompt`: Text prompt
- `temperature`: Randomness control (0-2)
- `maxTokens`: Maximum tokens to generate
- `topP`, `topK`: Sampling parameters
- `stopSequences`: Comma-separated stop words
- `stream`: Enable streaming responses
- `includeThinking`: Extract reasoning process

### 2. Chat Completion
Chat with conversation context using OpenAI-compatible format.

**Parameters:**
- `messages`: Chat messages - accepts multiple formats:
  - Plain text: `Hello!` (auto-converted to user message)
  - JSON array: `[{"role": "user", "content": "Hello"}]`
  - Empty: Uses the User Message field instead
- `userMessage`: Simple message input (used if messages is empty)
- `systemPrompt`: Optional system message
- All completion parameters (temperature, maxTokens, etc.)

### 3. Recursive Summary ⭐ NEW
Create hierarchical summaries of large documents.

**How it works:**
1. Splits large text into overlapping chunks
2. Summarizes each chunk (Level 0)
3. Merges and summarizes the summaries (Level 1)
4. Continues until reaching final summary

**Parameters:**
- `textSource`: Use input field or direct text
- `textField`: Field name containing text (if using field)
- `summaryText`: Direct text input (if not using field)

**Summary Options:**
- `maxChunkSize`: Maximum characters per chunk (default: 2048)
- `overlapSize`: Character overlap between chunks (default: 200)
- `summaryRatio`: Target compression ratio (default: 0.3)
- `maxLevels`: Maximum recursion depth (default: 3)
- `topic`: Optional topic focus
- `outputFormat`: 
  - `hierarchical`: Full structure with all levels
  - `final`: Just the final summary
  - `all`: Array of all summaries

### 4. Generate Embeddings
Create vector embeddings for text.

**Parameters:**
- `embeddingText`: Text to embed

### 5. Tokenize
Convert text to tokens for analysis.

**Parameters:**
- `tokenizeText`: Text to tokenize

### 6. Health Check
Check BitNet server status.

Returns:
- Server status
- Loaded model
- Available slots
- Version information

### 7. Server Control ⭐ NEW
Manage the BitNet server (managed mode only).

**Actions:**
- `start`: Start the server
- `stop`: Stop the server
- `restart`: Restart the server
- `status`: Check if running

## Parameters

### Generation Parameters

- **Temperature** (0-2): Controls randomness in generation
- **Max Tokens**: Maximum number of tokens to generate
- **Top P** (0-1): Nucleus sampling threshold
- **Top K**: Top K sampling parameter
- **Stop Sequences**: Comma-separated list of sequences to stop generation

### Performance Options

- **CPU Threads**: Number of CPU threads to use
- **GPU Layers**: Number of layers to offload to GPU (0 = CPU only)
- **Context Size**: Maximum context window size
- **Batch Size**: Batch size for processing

## Example Workflows

### Quick Import
Import the included example workflow to get started:
1. In n8n, go to Workflows → Import from File
2. Select `example-workflow.json` from this package
3. Click "Execute workflow" to test

### 1. Recursive Document Summarization

1. **Read File** node → reads large document
2. **BitNet LLM** node (Recursive Summary) → creates hierarchical summary
3. **IF** node → checks compression ratio
4. **Write File** node → saves final summary

### 2. Managed Server Chat Bot

1. **BitNet LLM** node (Server Control: Start) → ensures server is running
2. **Webhook** node → receives chat messages
3. **BitNet LLM** node (Chat) → processes conversation
4. **Respond to Webhook** node → sends response

### 3. Batch Document Processing

1. **Read Folder** node → gets multiple documents
2. **BitNet LLM** node (Recursive Summary) → summarizes each document
3. **Aggregate** node → combines summaries
4. **BitNet LLM** node (Completion) → creates meta-summary
5. **Write File** node → saves results

### 4. Smart Embeddings Pipeline

1. **BitNet LLM** node (Health Check) → verify server ready
2. **Split In Batches** node → process documents in chunks
3. **BitNet LLM** node (Embeddings) → generate vectors
4. **Pinecone** node → store embeddings
5. **BitNet LLM** node (Server Control: Stop) → clean up resources

## Recursive Summary Details

The recursive summary feature is designed for processing large documents efficiently:

### How It Works

1. **Intelligent Chunking**: 
   - Splits text at sentence boundaries
   - Maintains overlap between chunks for context
   - Estimates tokens to avoid exceeding limits

2. **Multi-Level Processing**:
   - **Level 0**: Initial summaries of raw chunks
   - **Level 1**: Summaries of summaries (more analytical)
   - **Level 2**: High-level key insights
   - **Level 3+**: Executive summary

3. **Smart Merging**:
   - Detects and removes duplicate content from overlaps
   - Maintains narrative flow between chunks
   - Preserves important details across levels

### Output Formats

#### Hierarchical (default)
```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "totalLevels": 3,
  "structure": [
    {
      "level": 0,
      "chunkCount": 5,
      "summaryCount": 5,
      "totalInputLength": 10000,
      "totalSummaryLength": 3000,
      "compressionRatio": "0.30"
    }
  ],
  "finalSummary": "Executive summary text..."
}
```

#### Final Only
```json
{
  "summary": "Final summary text...",
  "metadata": {
    "originalLength": 10000,
    "summaryLength": 500,
    "compressionRatio": "0.05",
    "levelsProcessed": 3
  }
}
```

## Benefits

- **Efficiency**: 1.58-bit models use ~10x less memory than traditional LLMs
- **Speed**: Up to 6x faster inference on CPU
- **Cost**: Run large models on consumer hardware
- **Privacy**: Fully local inference option
- **Scalability**: Process documents of any size with recursive summaries

## Troubleshooting

### Common Issues & Solutions

#### "Invalid JSON in messages parameter" Error
- **Solution**: Just type plain text in the Messages field (e.g., "Hello!")
- The node now auto-converts plain text to proper message format
- Or use the User Message field and leave Messages empty

#### "Connection refused" Error  
- **Check port**: Ensure BitNet is on port 8081 (not 8080)
- **Docker users**: Use `http://host.docker.internal:8081` not `localhost`
- **Verify server**: `curl http://localhost:8081/health`

#### Port 8080 Conflict
- BitNet now runs on port 8081 to avoid conflicts with web services
- Web interface uses port 8080
- Update any saved workflows to use port 8081

### Server Won't Start (Managed Mode)
```bash
# Check if binary exists
ls /path/to/BitNet/build/bin/llama-server

# Check if port is in use
lsof -i :8080

# Run setup script
./setup-bitnet.sh

# Test server wrapper manually
node bitnet-server-wrapper.js
```

### Connection Failed (External Mode)

- Verify BitNet server is running: `curl http://localhost:8080/health`
- Check firewall settings
- Ensure correct server URL in node configuration

### Out of Memory

- Reduce `maxChunkSize` for summaries
- Lower `contextSize` in performance options
- Use smaller model
- Increase Docker memory limit if using Docker

### Slow Performance

- Increase `threads` to match CPU cores
- Enable GPU with `gpuLayers` > 0
- Reduce `maxChunkSize` for faster processing
- Check CPU usage: `top` or `htop`

### Summary Quality Issues

- Lower `temperature` for more focused summaries
- Adjust `summaryRatio` for desired length
- Provide specific `topic` for better focus
- Increase `overlapSize` for better context

### Server Management Issues

- Ensure managed mode is selected for server control operations
- Check BitNet installation path is correct
- Verify user has permissions to start processes
- Check logs: `docker-compose -f docker-compose.bitnet.yml logs`

## Advanced Features

### Thinking/Reasoning Extraction
When models output thinking in `<think>` tags, the node automatically:
- Extracts the reasoning process
- Provides clean output without tags
- Makes reasoning available in `thinking` field

### Server Wrapper Capabilities
The managed server includes:
- Automatic health monitoring
- Graceful startup with retries
- Resource management
- Crash recovery
- Cache reuse for similar prompts

### Text Processing Utilities
- Sentence-aware splitting
- Overlap detection and merging
- Token estimation
- Configurable compression ratios

## Development

### Project Structure
```
n8n-nodes-bitnet/
├── nodes/
│   └── BitNet/
│       ├── BitNet.node.ts      # Main node implementation
│       ├── RecursiveSummary.ts # Summary utilities
│       └── bitnet.svg          # Node icon
├── bitnet-server-wrapper.js    # Server management
├── setup-bitnet.sh            # Setup script
├── package.json               # Node metadata
└── README.md                  # This file
```

### Building from Source
```bash
npm install       # Install dependencies
npm run build     # Build TypeScript
npm run lint      # Check code quality
```

### Testing
```bash
# Test server wrapper
node bitnet-server-wrapper.js

# Run setup script test
./setup-bitnet.sh
```

## Resources

- [BitNet GitHub Repository](https://github.com/microsoft/BitNet)
- [BitNet Paper](https://arxiv.org/abs/2310.11453)
- [llama.cpp](https://github.com/ggerganov/llama.cpp) - Underlying inference engine
- [n8n Documentation](https://docs.n8n.io)
- [n8n Community Nodes](https://docs.n8n.io/integrations/community-nodes/)

## License

MIT - See LICENSE file for details