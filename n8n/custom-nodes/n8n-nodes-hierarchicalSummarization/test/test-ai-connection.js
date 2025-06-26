#!/usr/bin/env node

/**
 * Test script to verify AI Language Model connections in n8n
 * This simulates how n8n connects AI models to consuming nodes
 */

// Mock n8n's NodeConnectionType enum
const NodeConnectionType = {
  Main: 'main',
  AiLanguageModel: 'ai_languageModel'
};

// Mock AI Language Model node (like BitNet, OpenAI, etc.)
class MockAILanguageModel {
  async supplyData() {
    console.log('✓ AI Model supplyData called');
    
    return {
      invoke: async (params) => {
        console.log('✓ AI Model invoke called with:', {
          messageCount: params.messages?.length || 0,
          hasOptions: !!params.options
        });
        
        // Simulate AI response
        const userMessage = params.messages?.find(m => m.role === 'user')?.content || '';
        const summary = `Summary: ${userMessage.substring(0, 50)}...`;
        
        // Return in OpenAI-like format
        return {
          choices: [{
            message: {
              content: summary
            }
          }]
        };
      }
    };
  }
}

// Mock execution functions (what n8n provides to nodes)
class MockExecuteFunctions {
  constructor(aiModel) {
    this.aiModel = aiModel;
  }
  
  async getInputConnectionData(connectionType, index) {
    console.log(`✓ getInputConnectionData called: type=${connectionType}, index=${index}`);
    
    if (connectionType === NodeConnectionType.AiLanguageModel && index === 0) {
      // This is what n8n does internally - calls supplyData on the connected node
      return await this.aiModel.supplyData();
    }
    
    throw new Error(`No connection of type ${connectionType} at index ${index}`);
  }
  
  getNode() {
    return { type: 'hierarchicalSummarization' };
  }
  
  getInputSourceData() {
    return [];
  }
}

// Test the connection pattern
async function testAIConnection() {
  console.log('Testing AI Language Model Connection Pattern\n');
  
  try {
    // Step 1: Create AI model node
    const aiModel = new MockAILanguageModel();
    console.log('1. Created AI Language Model node');
    
    // Step 2: Create execution context with AI model connected
    const executeFunctions = new MockExecuteFunctions(aiModel);
    console.log('2. Created execution context with AI model connected');
    
    // Step 3: Test getting the AI model connection (as HierarchicalSummarization does)
    console.log('\n3. Testing connection retrieval:');
    const languageModel = await executeFunctions.getInputConnectionData(
      NodeConnectionType.AiLanguageModel,
      0
    );
    
    // Step 4: Verify the model has invoke function
    console.log('\n4. Verifying model structure:');
    console.log('   - Has model:', !!languageModel);
    console.log('   - Has invoke:', typeof languageModel.invoke === 'function');
    console.log('   - Model keys:', Object.keys(languageModel));
    
    // Step 5: Test invoking the model
    console.log('\n5. Testing model invocation:');
    const response = await languageModel.invoke({
      messages: [
        { role: 'system', content: 'Summarize the following text' },
        { role: 'user', content: 'This is a long document about AI and machine learning...' }
      ],
      options: {
        temperature: 0.3,
        maxTokensToSample: 150
      }
    });
    
    // Step 6: Parse response
    console.log('\n6. Response received:');
    console.log('   - Response type:', typeof response);
    console.log('   - Has choices:', !!response.choices);
    console.log('   - Content:', response.choices?.[0]?.message?.content);
    
    console.log('\n✅ AI connection test passed!\n');
    
  } catch (error) {
    console.error('\n❌ AI connection test failed:', error.message);
    console.error(error.stack);
  }
}

// Test error scenarios
async function testErrorScenarios() {
  console.log('\nTesting Error Scenarios\n');
  
  // Test 1: No AI model connected
  console.log('Test 1: No AI model connected');
  try {
    const executeFunctions = new MockExecuteFunctions(null);
    await executeFunctions.getInputConnectionData(NodeConnectionType.AiLanguageModel, 0);
    console.log('❌ Should have thrown error');
  } catch (error) {
    console.log('✓ Correctly threw error:', error.message);
  }
  
  // Test 2: AI model without invoke function
  console.log('\nTest 2: AI model without invoke function');
  const brokenModel = {
    async supplyData() {
      return { notInvoke: 'wrong structure' };
    }
  };
  
  try {
    const executeFunctions = new MockExecuteFunctions(brokenModel);
    const model = await executeFunctions.getInputConnectionData(NodeConnectionType.AiLanguageModel, 0);
    
    if (typeof model.invoke !== 'function') {
      console.log('✓ Correctly detected missing invoke function');
    } else {
      console.log('❌ Should not have invoke function');
    }
  } catch (error) {
    console.log('Error:', error.message);
  }
}

// Run tests
async function runTests() {
  await testAIConnection();
  await testErrorScenarios();
  
  console.log('\nSummary:');
  console.log('- AI models provide data via supplyData() method');
  console.log('- supplyData() returns object with invoke() function');
  console.log('- Consuming nodes use getInputConnectionData() to access the model');
  console.log('- The invoke() function handles the actual AI API calls');
}

runTests();