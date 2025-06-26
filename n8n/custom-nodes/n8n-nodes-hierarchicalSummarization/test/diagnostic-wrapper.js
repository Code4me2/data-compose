#!/usr/bin/env node

/**
 * Diagnostic wrapper to understand AI model connection issues
 * This simulates what n8n does when connecting nodes
 */

// Mock n8n execution context
class MockExecuteFunctions {
  constructor(aiModel) {
    this.aiModel = aiModel;
    this.callCount = 0;
  }
  
  async getInputConnectionData(type, index) {
    console.log(`[DIAGNOSTIC] getInputConnectionData called:`, {
      type,
      index,
      callCount: ++this.callCount,
      timestamp: new Date().toISOString()
    });
    
    if (type === 'NodeConnectionType.AiLanguageModel' || type === 'ai_languageModel') {
      console.log(`[DIAGNOSTIC] Returning AI model:`, {
        hasModel: !!this.aiModel,
        hasInvoke: this.aiModel && typeof this.aiModel.invoke === 'function'
      });
      return this.aiModel;
    }
    
    return null;
  }
  
  getNode() {
    return { type: 'hierarchicalSummarization' };
  }
}

// Mock AI model (like BitNet would provide)
class MockAIModel {
  async invoke(params) {
    console.log(`[DIAGNOSTIC] AI model invoke called:`, {
      hasMessages: !!params.messages,
      messageCount: params.messages?.length,
      hasOptions: !!params.options
    });
    
    return {
      text: 'This is a mock summary of the content.',
      content: 'This is a mock summary of the content.'
    };
  }
}

// Test the connection pattern
async function testConnection() {
  console.log('=== AI Model Connection Diagnostic Test ===\n');
  
  // Test 1: With AI model
  console.log('Test 1: With AI model connected');
  const aiModel = new MockAIModel();
  const execFunctions = new MockExecuteFunctions(aiModel);
  
  try {
    // This mimics what the hierarchical summarization node does
    const languageModel = await execFunctions.getInputConnectionData('ai_languageModel', 0);
    
    if (!languageModel || typeof languageModel.invoke !== 'function') {
      throw new Error('No AI language model connected');
    }
    
    const response = await languageModel.invoke({
      messages: [
        { role: 'system', content: 'Summarize this' },
        { role: 'user', content: 'Test content' }
      ],
      options: { temperature: 0.3 }
    });
    
    console.log('[SUCCESS] AI model connection and invocation worked!');
    console.log('Response:', response);
  } catch (error) {
    console.log('[ERROR] Test 1 failed:', error.message);
  }
  
  // Test 2: Without AI model
  console.log('\n\nTest 2: Without AI model connected');
  const execFunctions2 = new MockExecuteFunctions(null);
  
  try {
    const languageModel = await execFunctions2.getInputConnectionData('ai_languageModel', 0);
    
    if (!languageModel || typeof languageModel.invoke !== 'function') {
      throw new Error('No AI language model connected');
    }
    
    console.log('[ERROR] This should not be reached');
  } catch (error) {
    console.log('[SUCCESS] Correctly detected missing AI model:', error.message);
  }
  
  // Test 3: With invalid AI model (no invoke method)
  console.log('\n\nTest 3: With invalid AI model (no invoke method)');
  const invalidModel = { someMethod: () => {} };
  const execFunctions3 = new MockExecuteFunctions(invalidModel);
  
  try {
    const languageModel = await execFunctions3.getInputConnectionData('ai_languageModel', 0);
    
    if (!languageModel || typeof languageModel.invoke !== 'function') {
      throw new Error('Connected model does not have invoke method');
    }
    
    console.log('[ERROR] This should not be reached');
  } catch (error) {
    console.log('[SUCCESS] Correctly detected invalid AI model:', error.message);
  }
}

// Run the diagnostic
testConnection().then(() => {
  console.log('\n=== Diagnostic Complete ===');
}).catch(error => {
  console.error('Diagnostic failed:', error);
});