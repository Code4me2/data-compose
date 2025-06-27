#!/usr/bin/env python3
"""
Mock BitNet server for testing the n8n node
Provides OpenAI-compatible endpoints
"""

from flask import Flask, request, jsonify
import time
import uuid

app = Flask(__name__)

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        "status": "ok",
        "model": "mock-bitnet-b1.58",
        "version": "1.0.0-mock",
        "slots": {"available": 4, "total": 4}
    })

@app.route('/completion', methods=['POST'])
def completion():
    data = request.json
    prompt = data.get('prompt', '')
    
    # Mock response
    response_text = f"This is a mock response to: {prompt[:50]}..."
    
    return jsonify({
        "choices": [{
            "text": response_text,
            "index": 0,
            "finish_reason": "stop"
        }],
        "model": "mock-bitnet-b1.58",
        "usage": {
            "prompt_tokens": len(prompt.split()),
            "completion_tokens": len(response_text.split()),
            "total_tokens": len(prompt.split()) + len(response_text.split())
        }
    })

@app.route('/v1/chat/completions', methods=['POST'])
def chat_completions():
    data = request.json
    messages = data.get('messages', [])
    
    # Get last user message
    last_message = "Hello!"
    for msg in reversed(messages):
        if msg.get('role') == 'user':
            last_message = msg.get('content', '')
            break
    
    response_text = f"Mock chat response to: {last_message[:50]}..."
    
    return jsonify({
        "id": f"chatcmpl-{uuid.uuid4().hex[:8]}",
        "object": "chat.completion",
        "created": int(time.time()),
        "model": "mock-bitnet-b1.58",
        "choices": [{
            "index": 0,
            "message": {
                "role": "assistant",
                "content": response_text
            },
            "finish_reason": "stop"
        }],
        "usage": {
            "prompt_tokens": sum(len(m.get('content', '').split()) for m in messages),
            "completion_tokens": len(response_text.split()),
            "total_tokens": sum(len(m.get('content', '').split()) for m in messages) + len(response_text.split())
        }
    })

@app.route('/v1/embeddings', methods=['POST'])
def embeddings():
    data = request.json
    input_text = data.get('input', '')
    
    # Mock embedding (384 dimensions like bge-small)
    mock_embedding = [0.1] * 384
    
    return jsonify({
        "object": "list",
        "data": [{
            "object": "embedding",
            "embedding": mock_embedding,
            "index": 0
        }],
        "model": "mock-bitnet-b1.58",
        "usage": {
            "prompt_tokens": len(input_text.split()),
            "total_tokens": len(input_text.split())
        }
    })

@app.route('/tokenize', methods=['POST'])
def tokenize():
    data = request.json
    content = data.get('content', '')
    
    # Simple mock tokenization (split by spaces)
    tokens = content.split()
    
    return jsonify({
        "tokens": tokens,
        "count": len(tokens)
    })

if __name__ == '__main__':
    print("Starting mock BitNet server on port 8081...")
    app.run(host='0.0.0.0', port=8081, debug=True)