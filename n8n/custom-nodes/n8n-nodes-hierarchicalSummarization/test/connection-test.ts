/**
 * Test file to verify AI model connection behavior
 */

import { IExecuteFunctions, NodeConnectionType } from 'n8n-workflow';

// Test different ways to access AI model connection
export async function testAIModelConnection(executeFunctions: IExecuteFunctions) {
  console.log('[TEST] Starting AI model connection test');
  
  // Method 1: Direct access
  try {
    console.log('[TEST] Method 1: Direct getInputConnectionData');
    const model1 = await executeFunctions.getInputConnectionData(
      NodeConnectionType.AiLanguageModel,
      0
    );
    console.log('[TEST] Method 1 result:', {
      success: true,
      hasModel: !!model1,
      type: typeof model1,
      hasInvoke: model1 && typeof (model1 as any).invoke === 'function'
    });
  } catch (error) {
    console.log('[TEST] Method 1 error:', error.message);
  }
  
  // Method 2: With retry
  try {
    console.log('[TEST] Method 2: With retry logic');
    let model2 = null;
    let attempts = 0;
    
    while (!model2 && attempts < 3) {
      attempts++;
      console.log(`[TEST] Attempt ${attempts}`);
      
      try {
        model2 = await executeFunctions.getInputConnectionData(
          NodeConnectionType.AiLanguageModel,
          0
        );
      } catch (e) {
        console.log(`[TEST] Attempt ${attempts} failed:`, e.message);
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    console.log('[TEST] Method 2 result:', {
      success: !!model2,
      attempts,
      hasModel: !!model2,
      hasInvoke: model2 && typeof (model2 as any).invoke === 'function'
    });
  } catch (error) {
    console.log('[TEST] Method 2 error:', error.message);
  }
  
  // Method 3: Check input source data
  try {
    console.log('[TEST] Method 3: Check input source data');
    const sourceData = executeFunctions.getInputSourceData();
    console.log('[TEST] Input source data:', sourceData);
  } catch (error) {
    console.log('[TEST] Method 3 error:', error.message);
  }
  
  // Method 4: Check workflow static data
  try {
    console.log('[TEST] Method 4: Check workflow static data');
    const workflowStaticData = executeFunctions.getWorkflowStaticData('node');
    console.log('[TEST] Workflow static data:', workflowStaticData);
  } catch (error) {
    console.log('[TEST] Method 4 error:', error.message);
  }
}

// Export a wrapper that can be called from the node
export async function diagnoseConnection(executeFunctions: IExecuteFunctions): Promise<any> {
  await testAIModelConnection(executeFunctions);
  
  // Return the actual model if found
  try {
    return await executeFunctions.getInputConnectionData(
      NodeConnectionType.AiLanguageModel,
      0
    );
  } catch (error) {
    console.log('[DIAGNOSE] Final connection attempt failed:', error.message);
    return null;
  }
}