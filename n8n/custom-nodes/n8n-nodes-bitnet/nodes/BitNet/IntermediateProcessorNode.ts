import {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
  IDataObject,
  NodeConnectionType,
} from 'n8n-workflow';

export class IntermediateProcessorNode implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Recursive Summary Processor',
    name: 'recursiveSummaryProcessor',
    icon: 'fa:layer-group',
    group: ['transform'],
    version: 1,
    description: 'Process intermediate levels in recursive summarization',
    defaults: {
      name: 'Summary Processor',
    },
    inputs: [
      {
        type: NodeConnectionType.Main,
        displayName: 'Summary Level Data',
      }
    ],
    outputs: [
      {
        type: NodeConnectionType.Main,
        displayName: 'Processed Level',
      }
    ],
    properties: [
      {
        displayName: 'Processing Type',
        name: 'processingType',
        type: 'options',
        options: [
          {
            name: 'Semantic Grouping',
            value: 'semantic',
            description: 'Group chunks by semantic similarity',
          },
          {
            name: 'Keyword Extraction',
            value: 'keywords',
            description: 'Extract and consolidate keywords',
          },
          {
            name: 'Entity Recognition',
            value: 'entities',
            description: 'Extract named entities',
          },
          {
            name: 'Topic Modeling',
            value: 'topics',
            description: 'Identify main topics',
          },
          {
            name: 'Custom Processing',
            value: 'custom',
            description: 'Apply custom processing logic',
          },
        ],
        default: 'semantic',
      },
      {
        displayName: 'Semantic Grouping Options',
        name: 'semanticOptions',
        type: 'collection',
        placeholder: 'Add Option',
        displayOptions: {
          show: {
            processingType: ['semantic'],
          },
        },
        default: {},
        options: [
          {
            displayName: 'Similarity Threshold',
            name: 'similarityThreshold',
            type: 'number',
            default: 0.7,
            typeOptions: {
              minValue: 0,
              maxValue: 1,
              numberPrecision: 2,
            },
            description: 'Minimum similarity score for grouping',
          },
          {
            displayName: 'Max Groups',
            name: 'maxGroups',
            type: 'number',
            default: 5,
            description: 'Maximum number of semantic groups',
          },
          {
            displayName: 'Embedding Model',
            name: 'embeddingModel',
            type: 'options',
            options: [
              {
                name: 'Use Connected Model',
                value: 'connected',
              },
              {
                name: 'TF-IDF',
                value: 'tfidf',
              },
              {
                name: 'Word2Vec',
                value: 'word2vec',
              },
            ],
            default: 'connected',
            description: 'Method for generating embeddings',
          },
        ],
      },
      {
        displayName: 'Keyword Options',
        name: 'keywordOptions',
        type: 'collection',
        placeholder: 'Add Option',
        displayOptions: {
          show: {
            processingType: ['keywords'],
          },
        },
        default: {},
        options: [
          {
            displayName: 'Max Keywords',
            name: 'maxKeywords',
            type: 'number',
            default: 10,
            description: 'Maximum keywords to extract per chunk',
          },
          {
            displayName: 'Keyword Algorithm',
            name: 'algorithm',
            type: 'options',
            options: [
              {
                name: 'TF-IDF',
                value: 'tfidf',
              },
              {
                name: 'RAKE',
                value: 'rake',
              },
              {
                name: 'TextRank',
                value: 'textrank',
              },
            ],
            default: 'tfidf',
          },
        ],
      },
      {
        displayName: 'Output Options',
        name: 'outputOptions',
        type: 'collection',
        placeholder: 'Add Option',
        default: {},
        options: [
          {
            displayName: 'Include Original Chunks',
            name: 'includeOriginal',
            type: 'boolean',
            default: true,
            description: 'Keep original chunks in output',
          },
          {
            displayName: 'Merge Similar Chunks',
            name: 'mergeSimilar',
            type: 'boolean',
            default: false,
            description: 'Merge highly similar chunks before summarization',
          },
          {
            displayName: 'Add Metadata',
            name: 'addMetadata',
            type: 'boolean',
            default: true,
            description: 'Add processing metadata to output',
          },
        ],
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];
    const processingType = this.getNodeParameter('processingType', 0) as string;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const levelData = item.json as IDataObject;
      
      // Validate input structure
      if (!levelData.chunks || !Array.isArray(levelData.chunks)) {
        throw new Error('Input must contain a "chunks" array');
      }

      let processedData: IDataObject = { ...levelData };

      switch (processingType) {
        case 'semantic':
          processedData = await this.processSemanticGrouping(levelData, i);
          break;
        case 'keywords':
          processedData = await this.processKeywordExtraction(levelData, i);
          break;
        case 'entities':
          processedData = await this.processEntityRecognition(levelData, i);
          break;
        case 'topics':
          processedData = await this.processTopicModeling(levelData, i);
          break;
        case 'custom':
          processedData = await this.processCustomLogic(levelData, i);
          break;
      }

      returnData.push({ 
        json: processedData,
        pairedItem: i,
      });
    }

    return [returnData];
  }

  private async processSemanticGrouping(
    levelData: IDataObject, 
    itemIndex: number
  ): Promise<IDataObject> {
    const options = this.getNodeParameter('semanticOptions', itemIndex) as IDataObject;
    const chunks = levelData.chunks as string[];
    
    // Placeholder for semantic grouping
    // In a real implementation, this would:
    // 1. Generate embeddings for each chunk
    // 2. Calculate pairwise similarities
    // 3. Cluster based on threshold
    
    const groups: IDataObject[] = [];
    const maxGroups = options.maxGroups as number || 5;
    const groupSize = Math.ceil(chunks.length / maxGroups);
    
    for (let i = 0; i < chunks.length; i += groupSize) {
      const groupChunks = chunks.slice(i, i + groupSize);
      groups.push({
        id: `group-${Math.floor(i / groupSize)}`,
        chunks: groupChunks,
        chunkIndices: Array.from({ length: groupChunks.length }, (_, j) => i + j),
        theme: `Theme ${Math.floor(i / groupSize) + 1}`, // Would be extracted from content
        keywords: [], // Would be extracted
        combinedText: groupChunks.join('\n\n'),
      });
    }

    return {
      ...levelData,
      semanticGroups: groups,
      processingMetadata: {
        type: 'semantic',
        groupCount: groups.length,
        similarityThreshold: options.similarityThreshold,
      },
    };
  }

  private async processKeywordExtraction(
    levelData: IDataObject, 
    itemIndex: number
  ): Promise<IDataObject> {
    const options = this.getNodeParameter('keywordOptions', itemIndex) as IDataObject;
    const chunks = levelData.chunks as string[];
    const maxKeywords = options.maxKeywords as number || 10;
    
    // Placeholder - would use actual keyword extraction
    const allKeywords: string[][] = chunks.map((chunk, idx) => 
      [`keyword${idx}-1`, `keyword${idx}-2`, `keyword${idx}-3`]
        .slice(0, maxKeywords)
    );
    
    // Consolidate keywords across chunks
    const keywordFrequency: { [key: string]: number } = {};
    allKeywords.flat().forEach(keyword => {
      keywordFrequency[keyword] = (keywordFrequency[keyword] || 0) + 1;
    });
    
    const consolidatedKeywords = Object.entries(keywordFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxKeywords * 2)
      .map(([keyword]) => keyword);

    return {
      ...levelData,
      chunkKeywords: allKeywords,
      consolidatedKeywords,
      keywordFrequency,
      processingMetadata: {
        type: 'keywords',
        algorithm: options.algorithm,
        totalKeywords: consolidatedKeywords.length,
      },
    };
  }

  private async processEntityRecognition(
    levelData: IDataObject, 
    itemIndex: number
  ): Promise<IDataObject> {
    const chunks = levelData.chunks as string[];
    
    // Placeholder - would use NER model
    const entities = {
      persons: ['John Doe', 'Jane Smith'],
      organizations: ['Acme Corp', 'Tech Industries'],
      locations: ['New York', 'California'],
      dates: ['2023-01-01', '2024-12-31'],
    };

    return {
      ...levelData,
      entities,
      processingMetadata: {
        type: 'entities',
        entityCount: Object.values(entities).flat().length,
      },
    };
  }

  private async processTopicModeling(
    levelData: IDataObject, 
    itemIndex: number
  ): Promise<IDataObject> {
    const chunks = levelData.chunks as string[];
    
    // Placeholder - would use topic modeling algorithm
    const topics = [
      {
        id: 'topic-1',
        name: 'Technology',
        keywords: ['software', 'development', 'innovation'],
        chunkIndices: [0, 2, 4],
        confidence: 0.85,
      },
      {
        id: 'topic-2',
        name: 'Business',
        keywords: ['market', 'strategy', 'growth'],
        chunkIndices: [1, 3, 5],
        confidence: 0.78,
      },
    ];

    return {
      ...levelData,
      topics,
      processingMetadata: {
        type: 'topics',
        topicCount: topics.length,
      },
    };
  }

  private async processCustomLogic(
    levelData: IDataObject, 
    itemIndex: number
  ): Promise<IDataObject> {
    // Custom processing logic would go here
    // This is where users could implement their own processing
    
    return {
      ...levelData,
      customProcessed: true,
      processingMetadata: {
        type: 'custom',
        timestamp: new Date().toISOString(),
      },
    };
  }
}