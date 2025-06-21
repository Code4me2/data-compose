# Quick Reference - BitNet & Hierarchical Summarization

## 🚀 Quick Start

### Start BitNet Server
```bash
cd ~/coding/bitnet-inference/BitNet
./build/bin/llama-server -m models/BitNet-b1.58-2B-4T/ggml-model-i2_s.gguf --port 11434 --threads 10 -c 2048 -n 512 --batch-size 128 > server.log 2>&1 &
```

### Check BitNet Health
```bash
curl -s http://localhost:11434/health
```

### Restart n8n (if needed)
```bash
cd ~/coding/data-compose
docker-compose restart n8n
```

## 🔧 Key Configurations

### BitNet Node
- Server URL: `http://localhost:11434`
- AI Model Output Limit: 50 tokens (adjustable)
- Model: BitNet b1.58 2B

### Hierarchical Summarization
- Batch Size: 512 (consider 1024 for speed)
- Summary Prompt: Customize for brevity
- Resilience: All features enabled by default

## 📊 Performance Expectations
- Token Generation: ~30 tokens/second
- Test Folder Processing: 2-3 minutes
- Convergence: May need 4-5 levels

## 🛠️ Troubleshooting

### If HS fails to converge:
1. Lower token limit to 30-40
2. Use more aggressive prompt
3. Increase batch size to 1024

### If BitNet crashes:
- Resilience features will kick in automatically
- Check server_restart.log for details
- Restart using quick start command

## 📁 Important Files
- `/home/manzanita/coding/PROJECT_STATE_2024-06-20.md` - Full status report
- `/home/manzanita/coding/bitnet-standardization-summary.md` - BitNet verification
- `/home/manzanita/coding/hs-processing-time-estimate.md` - Performance analysis

## 🔍 Test Commands
```bash
# Test BitNet token limits
node ~/coding/test-bitnet-token-limits.js

# Test BitNet speed
node ~/coding/bitnet-inference/test-token-speed.js

# Test HS resilience
cd ~/coding/data-compose/n8n/custom-nodes/n8n-nodes-hierarchicalSummarization
node test/test-resilience.js
```