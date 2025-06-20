import {
  IExecuteFunctions,
  ISupplyDataFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
  NodeConnectionType,
  IDataObject,
} from 'n8n-workflow';

/**
 * Minimal example of an AI Language Model provider node for n8n
 * This demonstrates the essential pattern for creating AI model connections
 */
export class MinimalAIModel implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Minimal AI Model',
    name: 'minimalAiModel',
    icon: 'fa:robot',
    group: ['ai', 'languageModel'],
    version: 1,
    description: 'Minimal example of an AI language model provider',
    defaults: {
      name: 'Minimal AI Model',
    },
    inputs: [NodeConnectionType.Main],
    outputs: [
      NodeConnectionType.Main,
      {
        type: NodeConnectionType.AiLanguageModel,
        displayName: 'Model'
      }
    ],
    properties: [
      {
        displayName: 'API Key',
        name: 'apiKey',
        type: 'string',
        typeOptions: {
          password: true,
        },
        default: '',
        required: true,
        description: 'API key for the AI service',
      },
      {
        displayName: 'Model',
        name: 'model',
        type: 'options',
        options: [
          {
            name: 'Small',
            value: 'small',
          },
          {
            name: 'Large',
            value: 'large',
          },
        ],
        default: 'small',
        description: 'The AI model to use',
      },
    ],
  };

  /**
   * Execute method for processing main input data
   * This is optional for AI model nodes that only provide model connections
   */
  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    
    // Simply pass through the input data
    // AI model nodes often don't process data directly
    return [items];
  }

  /**
   * Supply data method - this is the key method for AI model providers
   * It returns an object with an invoke function that consumer nodes will call
   */
  async supplyData(this: ISupplyDataFunctions): Promise<any> {
    // Get configuration from node parameters
    const apiKey = this.getNodeParameter('apiKey', 0) as string;
    const model = this.getNodeParameter('model', 0) as string;
    
    // Return the model interface
    return {
      /**
       * The invoke function is what consumer nodes will call
       * It should accept a standard format and return a standard response
       */
      invoke: async (params: {
        messages: Array<{role: string, content: string}>,
        options?: {
          temperature?: number,
          maxTokensToSample?: number,
          stopSequences?: string[],
          [key: string]: any
        }
      }) => {
        const { messages, options = {} } = params;
        
        // Example: Make API call to your AI service
        // In a real implementation, this would call your actual AI API
        try {
          // For demonstration, we'll simulate an API call
          const simulatedResponse = await this.simulateAPICall({
            apiKey,
            model,
            messages,
            temperature: options.temperature ?? 0.7,
            maxTokens: options.maxTokensToSample ?? 512,
          });
          
          // Return in OpenAI-compatible format
          // This is the most common format that consumer nodes expect
          return {
            choices: [{
              message: {
                role: 'assistant',
                content: simulatedResponse
              },
              finish_reason: 'stop',
              index: 0
            }],
            usage: {
              prompt_tokens: 50,
              completion_tokens: 100,
              total_tokens: 150
            }
          };
          
        } catch (error) {
          // Proper error handling is important
          throw new Error(`AI Model Error: ${error.message}`);
        }
      }
    };
  }

  /**
   * Simulated API call for demonstration
   * Replace this with actual API calls in production
   */
  private async simulateAPICall(params: any): Promise<string> {
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Extract the last user message
    const lastUserMessage = params.messages
      .filter((m: any) => m.role === 'user')
      .pop()?.content || 'No message';
    
    // Generate a simulated response
    return `[${params.model} model] Processed: "${lastUserMessage.substring(0, 50)}..."`;
  }
}

/**
 * Example of how a consumer node would use this AI model:
 * 
 * const languageModel = await this.getInputConnectionData(
 *   NodeConnectionType.AiLanguageModel,
 *   0
 * );
 * 
 * const response = await languageModel.invoke({
 *   messages: [
 *     { role: 'system', content: 'You are a helpful assistant.' },
 *     { role: 'user', content: 'Tell me a joke.' }
 *   ],
 *   options: {
 *     temperature: 0.8,
 *     maxTokensToSample: 100
 *   }
 * });
 * 
 * const content = response.choices[0].message.content;
 */