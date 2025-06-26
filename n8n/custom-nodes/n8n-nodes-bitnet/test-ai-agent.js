#!/usr/bin/env node

/**
 * Test script to verify BitNet AI Agent integration
 * This simulates how n8n AI Agents will call the node
 */

const axios = require('axios');

const BITNET_URL = 'http://localhost:8081';

async function testBitNetServer() {
  console.log('Testing BitNet server connection...');
  
  try {
    // Test health endpoint
    const healthResponse = await axios.get(`${BITNET_URL}/health`);
    console.log('✅ BitNet server is healthy:', healthResponse.data);
    
    // Test chat completions endpoint (simulating AI Agent call)
    console.log('\nTesting chat completions endpoint...');
    const chatResponse = await axios.post(`${BITNET_URL}/v1/chat/completions`, {
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'What is BitNet and why is it efficient?' }
      ],
      temperature: 0.7,
      max_tokens: 100
    }, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    console.log('✅ Chat response received:');
    console.log('Content:', chatResponse.data.choices[0].message.content);
    console.log('Usage:', chatResponse.data.usage);
    
    return true;
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    return false;
  }
}

async function simulateAIAgentCall() {
  console.log('\n\nSimulating AI Agent integration call...');
  
  // This simulates what the supplyData method returns
  const modelInterface = {
    invoke: async (params) => {
      const { messages, options = {} } = params;
      
      try {
        const response = await axios.post(`${BITNET_URL}/v1/chat/completions`, {
          model: 'models/BitNet-b1.58-2B-4T/ggml-model-i2_s.gguf',
          messages: messages,
          temperature: options.temperature ?? 0.7,
          max_tokens: options.maxTokensToSample ?? 512,
          top_p: options.topP ?? 0.9,
          top_k: options.topK ?? 40,
          stream: false
        }, {
          headers: { 'Content-Type': 'application/json' }
        });
        
        const content = response.data.choices?.[0]?.message?.content || '';
        
        return {
          text: content,
          content: content,
          usage: response.data.usage
        };
      } catch (error) {
        throw new Error(`Failed to connect to BitNet: ${error.message}`);
      }
    }
  };
  
  // Test the invoke method
  try {
    const result = await modelInterface.invoke({
      messages: [
        { role: 'user', content: 'Hello! Can you explain what makes you special?' }
      ],
      options: {
        temperature: 0.8,
        maxTokensToSample: 150
      }
    });
    
    console.log('✅ AI Agent simulation successful!');
    console.log('Response:', result.text);
    console.log('Token usage:', result.usage);
    
    return true;
  } catch (error) {
    console.error('❌ AI Agent simulation failed:', error.message);
    return false;
  }
}

async function main() {
  console.log('BitNet AI Agent Integration Test\n================================\n');
  
  // First test basic server connectivity
  const serverOk = await testBitNetServer();
  
  if (serverOk) {
    // Then simulate AI Agent integration
    await simulateAIAgentCall();
  } else {
    console.log('\n⚠️  Please ensure BitNet server is running on port 8081');
    console.log('Run: cd /home/manzanita/coding/bitnet-inference/BitNet && ./build/bin/llama-server -m models/BitNet-b1.58-2B-4T/ggml-model-i2_s.gguf --host 0.0.0.0 --port 8081');
  }
}

main().catch(console.error);