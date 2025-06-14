# BitNet Node Environment Configuration

This guide explains how to configure the BitNet n8n node using environment variables to avoid hardcoded paths.

## Quick Start

1. Copy the example environment file:
   ```bash
   cp .env.bitnet.example .env.bitnet
   ```

2. Edit `.env.bitnet` with your system-specific paths:
   ```bash
   nano .env.bitnet
   ```

3. Install dependencies and rebuild:
   ```bash
   npm install
   npm run build
   ```

## Environment Variables

### Required Variables

- **`BITNET_INSTALLATION_PATH`**: Path to your BitNet installation directory
  - Default: `/opt/bitnet`
  - Example: `/home/user/bitnet-inference/BitNet`

- **`BITNET_MODEL_PATH`**: Path to the model file (relative to BITNET_INSTALLATION_PATH or absolute)
  - Default: `models/BitNet-b1.58-2B-4T/ggml-model-i2_s.gguf`
  - Example: `/path/to/models/bitnet-model.gguf`

### Server Configuration

- **`BITNET_SERVER_HOST`**: Host address for the BitNet server
  - Default: `0.0.0.0`
  - Use `127.0.0.1` for local-only access

- **`BITNET_SERVER_PORT`**: Port for the BitNet server
  - Default: `8080`

- **`BITNET_EXTERNAL_SERVER_URL`**: URL for external server mode
  - Default: `http://localhost:8080`
  - Docker: `http://host.docker.internal:8080`

### Performance Settings

- **`BITNET_CONTEXT_SIZE`**: Maximum context window size
  - Default: `4096`
  - Range: 512-8192

- **`BITNET_CPU_THREADS`**: Number of CPU threads
  - Default: `4`
  - Recommendation: Set to number of physical cores

- **`BITNET_GPU_LAYERS`**: Layers to offload to GPU
  - Default: `0` (CPU only)
  - Set higher for GPU acceleration

- **`BITNET_BATCH_SIZE`**: Batch size for processing
  - Default: `512`

### Advanced Settings

- **`BITNET_CONTINUOUS_BATCHING`**: Enable continuous batching
  - Default: `true`
  - Values: `true` or `false`

- **`BITNET_CACHE_REUSE`**: Cache reuse for similar prompts
  - Default: `256`

- **`BITNET_MAX_PARALLEL`**: Maximum parallel requests
  - Default: `1`

## Docker Configuration

When running n8n in Docker, you need to consider network connectivity:

### Option 1: External Server on Host
If BitNet server runs on the host machine:
```env
BITNET_EXTERNAL_SERVER_URL=http://host.docker.internal:8080
```

### Option 2: Managed Server in Container
Mount the BitNet installation into the container:
```yaml
volumes:
  - /path/to/bitnet:/opt/bitnet
```

Then set:
```env
BITNET_INSTALLATION_PATH=/opt/bitnet
```

## Troubleshooting

### Model Not Found
- Verify `BITNET_INSTALLATION_PATH` exists
- Check if `BITNET_MODEL_PATH` is correct
- Use absolute paths if relative paths fail

### Server Connection Failed
- Check if port is already in use
- Verify firewall settings
- For Docker, ensure proper network mode

### Performance Issues
- Increase `BITNET_CPU_THREADS`
- Enable GPU with `BITNET_GPU_LAYERS`
- Adjust `BITNET_BATCH_SIZE` based on memory

## Example Configurations

### Local Development
```env
BITNET_INSTALLATION_PATH=/home/dev/bitnet-inference/BitNet
BITNET_MODEL_PATH=models/BitNet-b1.58-2B-4T/ggml-model-i2_s.gguf
BITNET_SERVER_PORT=8080
BITNET_CPU_THREADS=8
```

### Docker Production
```env
BITNET_INSTALLATION_PATH=/opt/bitnet
BITNET_EXTERNAL_SERVER_URL=http://host.docker.internal:8080
BITNET_CONTEXT_SIZE=8192
BITNET_GPU_LAYERS=20
```

### Resource-Constrained
```env
BITNET_CONTEXT_SIZE=2048
BITNET_CPU_THREADS=2
BITNET_BATCH_SIZE=256
BITNET_CONTINUOUS_BATCHING=false
```