#!/bin/bash

# BitNet Node Setup Script
# This script helps set up the BitNet node for n8n

set -e

echo "BitNet Node Setup for n8n"
echo "========================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "Error: Please run this script from the n8n-nodes-bitnet directory"
    exit 1
fi

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo "Checking prerequisites..."

if ! command_exists node; then
    echo "Error: Node.js is not installed"
    exit 1
fi

if ! command_exists npm; then
    echo "Error: npm is not installed"
    exit 1
fi

# Check BitNet installation
BITNET_PATH="${BITNET_PATH:-/home/manzanita/coding/bitnet-inference/BitNet}"
echo "Checking BitNet installation at: $BITNET_PATH"

if [ ! -d "$BITNET_PATH" ]; then
    echo "Error: BitNet directory not found at $BITNET_PATH"
    echo "Please set BITNET_PATH environment variable or install BitNet"
    exit 1
fi

if [ ! -f "$BITNET_PATH/build/bin/llama-server" ]; then
    echo "Error: BitNet server binary not found"
    echo "Please build BitNet first:"
    echo "  cd $BITNET_PATH"
    echo "  python setup_env.py"
    exit 1
fi

# Check for models
echo "Checking for BitNet models..."
MODEL_DIR="$BITNET_PATH/models"
if [ ! -d "$MODEL_DIR" ]; then
    echo "Warning: Models directory not found at $MODEL_DIR"
    echo "You'll need to download models before using the node"
fi

# Install dependencies
echo "Installing node dependencies..."
npm install

# Build the node
echo "Building BitNet node..."
npm run build

# Check if build was successful
if [ ! -d "dist" ]; then
    echo "Error: Build failed - dist directory not created"
    exit 1
fi

# Create environment file template
ENV_FILE=".env.bitnet"
if [ ! -f "$ENV_FILE" ]; then
    echo "Creating environment template..."
    cat > "$ENV_FILE" << EOF
# BitNet Configuration
BITNET_PATH=$BITNET_PATH
BITNET_PORT=8080
BITNET_MODEL=models/BitNet-b1.58-2B-4T/ggml-model-i2_s.gguf
BITNET_THREADS=4
BITNET_CONTEXT_SIZE=4096
BITNET_GPU_LAYERS=0
BITNET_MEMORY_LIMIT=8G
BITNET_CPU_LIMIT=4
EOF
    echo "Created $ENV_FILE - please review and adjust settings"
fi

# Test the server wrapper
echo "Testing BitNet server wrapper..."
if node -e "const wrapper = require('./bitnet-server-wrapper.js'); console.log('Server wrapper loaded successfully')"; then
    echo "✓ Server wrapper is functional"
else
    echo "✗ Server wrapper test failed"
    exit 1
fi

# Create a test script
TEST_SCRIPT="test-bitnet-node.js"
cat > "$TEST_SCRIPT" << 'EOF'
const BitNetServerWrapper = require('./bitnet-server-wrapper.js');

async function testServer() {
    console.log('Testing BitNet server...');
    const wrapper = new BitNetServerWrapper();
    
    try {
        // Check health without starting
        console.log('Checking if external server is running...');
        const health = await wrapper.checkHealth().catch(() => null);
        
        if (health) {
            console.log('✓ External BitNet server is already running');
            console.log('  Status:', health.status);
            console.log('  Model:', health.model);
        } else {
            console.log('✗ No external server detected');
            console.log('  You can start one with: node bitnet-server-wrapper.js');
        }
    } catch (error) {
        console.error('Error during test:', error.message);
    }
}

testServer();
EOF

# Summary
echo ""
echo "Setup Complete!"
echo "==============="
echo ""
echo "Next steps:"
echo "1. Review the configuration in $ENV_FILE"
echo "2. Start the BitNet server:"
echo "   - External: cd $BITNET_PATH && ./build/bin/llama-server -m <model> --host 0.0.0.0 --port 8080"
echo "   - Managed: The node will auto-start the server when needed"
echo "3. Restart n8n to load the new node"
echo "4. Look for 'BitNet LLM' in the n8n node palette"
echo ""
echo "To test the server wrapper:"
echo "  node $TEST_SCRIPT"
echo ""
echo "For Docker deployment, use:"
echo "  docker-compose -f ../../docker-compose.bitnet.yml up -d"

# Make scripts executable
chmod +x bitnet-server-wrapper.js 2>/dev/null || true

echo ""
echo "Happy summarizing! 🚀"