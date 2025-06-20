/**
 * Simplified AI Language Model connection code for HierarchicalSummarization node
 * This shows the clean, production-ready approach to connecting AI models
 */

// Current implementation (lines 1086-1130) can be simplified to:

async function getAILanguageModel(executeFunctions: IExecuteFunctions): Promise<any> {
  try {
    // Get the AI model connection - this is all that's needed
    const languageModel = await executeFunctions.getInputConnectionData(
      NodeConnectionType.AiLanguageModel,
      0
    );
    
    // Validate the model has the required invoke function
    if (!languageModel || typeof languageModel.invoke !== 'function') {
      throw new Error(
        'No AI language model connected. Please connect an AI language model ' +
        '(like BitNet, OpenAI, Anthropic, etc.) to the Language Model input.'
      );
    }
    
    return languageModel;
  } catch (error) {
    // Re-throw with more context if needed
    if (error.message.includes('No AI language model connected')) {
      throw error;
    }
    throw new Error(`Failed to connect to AI language model: ${error.message}`);
  }
}

// Usage in summarizeChunk function:
async function summarizeChunk(
  chunk: DocumentChunk,
  previousSummary: string | null,
  config: ProcessingConfig,
  executeFunctions: IExecuteFunctions
): Promise<string> {
  // Build the prompt
  let systemPrompt = config.summaryPrompt;
  if (config.contextPrompt) {
    systemPrompt += `\n\nAdditional context: ${config.contextPrompt}`;
  }
  
  // Build the content
  let userContent = '';
  if (previousSummary) {
    userContent = `Previous summary: ${previousSummary}\n\n`;
  }
  userContent += `<c>${chunk.content}</c>`;
  
  try {
    // Get the AI model - clean and simple
    const languageModel = await getAILanguageModel(executeFunctions);
    
    // Call the language model
    const response = await languageModel.invoke({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent }
      ],
      options: {
        temperature: 0.3,
        maxTokensToSample: 150,
      }
    });

    // Parse the response
    const summary = parseAIResponse(response);
    
    if (!summary) {
      throw new Error('AI model returned empty response');
    }

    return summary.trim();
    
  } catch (error) {
    // Handle errors gracefully
    const errorMessage = error.message || 'Unknown error';
    
    // Extract key content for fallback
    const sentences = splitIntoSentences(chunk.content);
    const keyContent = sentences.slice(0, 2).join(' ').trim() || 
                      chunk.content.substring(0, 200);
    
    return `[AI Error: ${errorMessage}] Key content from chunk ${chunk.index}: ${keyContent}...`;
  }
}

// Remove debug code from execute method (lines 242-255)
// The debug check at the start of execute() can be completely removed as it's not needed

// Benefits of this approach:
// 1. Cleaner, more maintainable code
// 2. No debug console.log statements in production
// 3. Clear error messages for users
// 4. Follows n8n's intended design pattern
// 5. Works with any AI model that implements the supply data pattern