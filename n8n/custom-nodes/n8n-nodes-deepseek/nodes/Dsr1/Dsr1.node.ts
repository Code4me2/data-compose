import {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
} from 'n8n-workflow';

export class Dsr1 implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'DeepSeek R1',
    name: 'dsr1',
    group: ['transform'],
    version: 1,
    description: 'Interact with DeepSeek-r1:1.5B model via Ollama',
    defaults: {
      name: 'DeepSeek R1',
    },
    inputs: ['main'],
    outputs: ['main'],
    properties: [
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        options: [
          {
            name: 'Generate Text',
            value: 'generateText',
          },
          {
            name: 'Chat',
            value: 'chat',
          },
        ],
        default: 'generateText',
      },
      {
        displayName: 'Prompt',
        name: 'prompt',
        type: 'string',
        default: '',
        displayOptions: {
          show: {
            operation: ['generateText'],
          },
        },
        description: 'Text prompt to send to the model',
      },
      {
        displayName: 'Message',
        name: 'message',
        type: 'string',
        default: '',
        displayOptions: {
          show: {
            operation: ['chat'],
          },
        },
        description: 'Message to send to the chat model',
      },
      {
        displayName: 'Show Thinking Process',
        name: 'showThinking',
        type: 'boolean',
        default: false,
        description: 'Whether to include thinking sections in output',
      },
      {
        displayName: 'Temperature',
        name: 'temperature',
        type: 'number',
        default: 0.7,
        description: 'Control randomness: lower is more deterministic (0.0-1.0)',
      },
      {
        displayName: 'Max Tokens',
        name: 'maxTokens',
        type: 'number',
        default: 1024,
        description: 'Maximum number of tokens to generate',
      },
      {
        displayName: 'Endpoint URL',
        name: 'endpointUrl',
        type: 'string',
        default: 'http://host.docker.internal:11434/api/generate',
        description: 'URL of the Ollama API endpoint',
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];

    for (let i = 0; i < items.length; i++) {
      const operation = this.getNodeParameter('operation', i) as string;
      const temperature = this.getNodeParameter('temperature', i) as number;
      const maxTokens = this.getNodeParameter('maxTokens', i) as number;
      const showThinking = this.getNodeParameter('showThinking', i) as boolean;
      const endpointUrl = this.getNodeParameter('endpointUrl', i) as string;
      
      let prompt = '';
      if (operation === 'generateText') {
        prompt = this.getNodeParameter('prompt', i) as string;
      } else if (operation === 'chat') {
        prompt = this.getNodeParameter('message', i) as string;
      }
      
      if (!prompt) {
        throw new Error('Prompt or message is required');
      }
      
      try {
        // Make HTTP request to the Ollama API
        const response = await fetch(endpointUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'deepseek-r1:1.5b',
            prompt: prompt,
            temperature: temperature,
            max_tokens: maxTokens,
            stream: false,
          }),
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Extract thinking process if enabled and available
        let thinking = '';
        let result = data.response || '';
        
        // Check if the response contains a thinking section (between <think> tags)
        const thinkMatch = result.match(/<think>([\s\S]*?)<\/think>/);
        if (thinkMatch) {
          thinking = thinkMatch[1].trim();
          // Remove the thinking section from the final result if not showing thinking
          if (!showThinking) {
            result = result.replace(/<think>[\s\S]*?<\/think>/, '').trim();
          }
        }
        
        returnData.push({
          json: {
            response: result,
            thinking: thinking,
            hasThinking: !!thinking,
            rawResponse: data,
          },
        });
      } catch (error) {
        if (error instanceof Error) {
          throw new Error(`Failed to process with DeepSeek: ${error.message}`);
        }
        throw error;
      }
    }

    return [returnData];
  }
}
