#!/usr/bin/env node

/**
 * Test script to verify the structure of supplyData return value
 */

const { BitNet } = require('./dist/nodes/BitNet/BitNet.node.js');

// Mock the ISupplyDataFunctions interface
const mockSupplyDataContext = {
  getNodeParameter: (paramName, itemIndex, defaultValue) => {
    const params = {
      serverMode: 'external',
      serverUrl: 'http://localhost:8081',
      model: 'models/BitNet-b1.58-2B-4T/ggml-model-i2_s.gguf',
      additionalOptions: {
        temperature: 0.7,
        maxTokens: 512
      },
      performanceOptions: {}
    };
    return params[paramName] || defaultValue;
  },
  getNode: () => ({ name: 'BitNet', type: 'bitnet' }),
  helpers: {
    httpRequest: async (options) => {
      console.log('HTTP Request:', options);
      // Mock response
      return {
        choices: [{
          message: {
            content: 'This is a test response from BitNet'
          }
        }],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 20,
          total_tokens: 30
        }
      };
    }
  }
};

async function testSupplyData() {
  console.log('Testing BitNet supplyData method...\n');
  
  const bitnetNode = new BitNet();
  
  // Call supplyData with mocked context
  const supplyDataResult = await bitnetNode.supplyData.call(mockSupplyDataContext);
  
  console.log('supplyData returned:', typeof supplyDataResult);
  console.log('Keys:', Object.keys(supplyDataResult));
  
  if (supplyDataResult.invoke) {
    console.log('\ninvoke function exists');
    console.log('Testing invoke function...\n');
    
    try {
      const invokeResult = await supplyDataResult.invoke({
        messages: [
          { role: 'user', content: 'Hello, test message' }
        ],
        options: {
          temperature: 0.8
        }
      });
      
      console.log('invoke result:', invokeResult);
    } catch (error) {
      console.error('invoke error:', error.message);
    }
  }
  
  // Check if it matches LangChain expectations
  if (supplyDataResult.response) {
    console.log('\nLangChain-style response property exists');
    console.log('Response type:', typeof supplyDataResult.response);
  } else {
    console.log('\nNo LangChain-style response property found');
    console.log('This might be why the connection to hierarchical summarization is failing');
  }
}

testSupplyData().catch(console.error);