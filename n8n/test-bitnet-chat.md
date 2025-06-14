# Testing BitNet Chat Node in N8N

## Quick Test Instructions

1. **Access N8N**: Go to http://localhost:5678

2. **Create New Workflow**:
   - Click "New workflow"
   - Add a "Manual" trigger node
   - Add a "BitNet LLM" node

3. **Configure BitNet Node**:
   - **Operation**: Chat Completion
   - **Server Mode**: External Server
   - **Server URL**: `http://host.docker.internal:8080`
   - **Model**: BitNet b1.58 2B (default)
   - **User Message**: "Hello! What is BitNet?"
   - Leave "Messages" field empty (it will use User Message)

4. **Connect and Test**:
   - Connect Manual trigger to BitNet node
   - Click "Execute workflow"
   - Check the output

## Alternative: Using Messages Array

If you want to test with the full messages format:

**Messages** field:
```json
[
  {"role": "user", "content": "What is artificial intelligence?"}
]
```

Or with system prompt:
```json
[
  {"role": "system", "content": "You are a helpful AI assistant."},
  {"role": "user", "content": "Explain quantum computing in simple terms."}
]
```

## Troubleshooting

1. **"Invalid JSON" error**: 
   - Use the "User Message" field instead of Messages
   - Or ensure Messages contains valid JSON array

2. **Connection refused**:
   - Check BitNet server is running: `ps aux | grep llama-server`
   - Verify server URL is `http://host.docker.internal:8080`

3. **No response**:
   - Check Docker logs: `docker logs data-compose-n8n-1`
   - Ensure BitNet server health: `curl http://localhost:8080/health`