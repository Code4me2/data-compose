import {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
  IDataObject,
  NodeOperationError,
  NodeConnectionType,
} from 'n8n-workflow';

export class HaystackSearch implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Haystack Search',
    name: 'haystackSearch',
    icon: 'file:haystack.svg',
    group: ['transform'],
    version: 1,
    subtitle: '={{$parameter.operation + ": " + $parameter.resource}}',
    description: 'Interact with Haystack and Elasticsearch for legal document analysis',
    defaults: {
      name: 'Haystack Search',
    },
    inputs: [{ type: NodeConnectionType.Main }],
    outputs: [{ type: NodeConnectionType.Main }],
    properties: [
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        options: [
          {
            name: 'Ingest Documents',
            value: 'ingest',
            description: 'Ingest documents with hierarchy metadata',
            action: 'Ingest documents',
          },
          {
            name: 'Search',
            value: 'search',
            description: 'Search documents using hybrid search',
            action: 'Search documents',
          },
          {
            name: 'Get Hierarchy',
            value: 'hierarchy',
            description: 'Get document hierarchy and relationships',
            action: 'Get document hierarchy',
          },
          {
            name: 'Health Check',
            value: 'health',
            description: 'Check service health status',
            action: 'Check service health',
          },
          {
            name: 'Get By Stage',
            value: 'getByStage',
            description: 'Get documents at specific workflow stage',
            action: 'Get documents by processing stage',
          },
          {
            name: 'Update Status',
            value: 'updateStatus',
            description: 'Update document processing status',
            action: 'Update document workflow status',
          },
          {
            name: 'Batch Hierarchy',
            value: 'batchHierarchy',
            description: 'Get hierarchy for multiple documents',
            action: 'Get batch document relationships',
          },
          {
            name: 'Get Final Summary',
            value: 'getFinalSummary',
            description: 'Get the final summary document for a workflow',
            action: 'Get workflow final summary',
          },
          {
            name: 'Get Complete Tree',
            value: 'getCompleteTree',
            description: 'Get complete hierarchical tree structure for a workflow',
            action: 'Get workflow tree structure',
          },
          {
            name: 'Get Document with Context',
            value: 'getDocumentWithContext',
            description: 'Get document content with tree navigation context',
            action: 'Get document with navigation context',
          },
        ],
        default: 'search',
      },
      // Ingest operation parameters
      {
        displayName: 'Documents',
        name: 'documents',
        type: 'json',
        default: '[]',
        required: true,
        displayOptions: {
          show: {
            operation: ['ingest'],
          },
        },
        description: 'Array of documents to ingest. Each document should have content, metadata, document_type, and hierarchy information.',
        placeholder: `[
  {
    "content": "Document content here",
    "metadata": {"source": "file.pdf", "page": 1},
    "document_type": "source_document",
    "hierarchy_level": 0
  }
]`,
      },
      // Search operation parameters
      {
        displayName: 'Query',
        name: 'query',
        type: 'string',
        default: '',
        required: true,
        displayOptions: {
          show: {
            operation: ['search'],
          },
        },
        description: 'Search query text',
        placeholder: 'constitutional rights due process',
      },
      {
        displayName: 'Search Type',
        name: 'searchType',
        type: 'options',
        options: [
          {
            name: 'Hybrid',
            value: 'hybrid',
            description: 'Combine keyword and semantic search',
          },
          {
            name: 'Vector',
            value: 'vector',
            description: 'Semantic search using embeddings',
          },
          {
            name: 'BM25',
            value: 'bm25',
            description: 'Keyword-based search',
          },
        ],
        default: 'hybrid',
        displayOptions: {
          show: {
            operation: ['search'],
          },
        },
        description: 'Type of search to perform',
      },
      {
        displayName: 'Top K Results',
        name: 'topK',
        type: 'number',
        default: 10,
        displayOptions: {
          show: {
            operation: ['search'],
          },
        },
        description: 'Number of top results to return',
      },
      {
        displayName: 'Include Hierarchy',
        name: 'includeHierarchy',
        type: 'boolean',
        default: false,
        displayOptions: {
          show: {
            operation: ['search'],
          },
        },
        description: 'Whether to include document hierarchy in results',
      },
      {
        displayName: 'Filters',
        name: 'filters',
        type: 'json',
        default: '{}',
        displayOptions: {
          show: {
            operation: ['search'],
          },
        },
        description: 'Additional filters to apply to search',
        placeholder: '{"document_type": "summary", "hierarchy.level": 2}',
      },
      // Hierarchy operation parameters
      {
        displayName: 'Document ID',
        name: 'documentId',
        type: 'string',
        default: '',
        required: true,
        displayOptions: {
          show: {
            operation: ['hierarchy'],
          },
        },
        description: 'ID of the document to get hierarchy for',
      },
      {
        displayName: 'Include Parents',
        name: 'includeParents',
        type: 'boolean',
        default: true,
        displayOptions: {
          show: {
            operation: ['hierarchy'],
          },
        },
        description: 'Whether to include parent documents',
      },
      {
        displayName: 'Include Children',
        name: 'includeChildren',
        type: 'boolean',
        default: true,
        displayOptions: {
          show: {
            operation: ['hierarchy'],
          },
        },
        description: 'Whether to include child documents',
      },
      {
        displayName: 'Max Depth',
        name: 'maxDepth',
        type: 'number',
        default: 3,
        displayOptions: {
          show: {
            operation: ['hierarchy'],
          },
        },
        description: 'Maximum depth to traverse in hierarchy',
      },
      // Get By Stage operation parameters
      {
        displayName: 'Stage Type',
        name: 'stageType',
        type: 'options',
        options: [
          {
            name: 'Ready for Chunking',
            value: 'ready_chunk',
            description: 'Source documents ready to be split into chunks',
          },
          {
            name: 'Ready for Summarization',
            value: 'ready_summarize',
            description: 'Chunks ready for AI summarization',
          },
          {
            name: 'Ready for Aggregation',
            value: 'ready_aggregate',
            description: 'Summaries ready to be combined into higher-level summaries',
          },
          {
            name: 'Processing Complete',
            value: 'completed',
            description: 'Documents that have completed processing',
          },
        ],
        default: 'ready_summarize',
        required: true,
        displayOptions: {
          show: {
            operation: ['getByStage'],
          },
        },
        description: 'Type of processing stage to query',
      },
      {
        displayName: 'Hierarchy Level',
        name: 'hierarchyLevel',
        type: 'number',
        default: 1,
        displayOptions: {
          show: {
            operation: ['getByStage'],
          },
        },
        description: 'Specific hierarchy level to filter (optional, 0 for all levels)',
      },
      // Update Status operation parameters
      {
        displayName: 'Document ID',
        name: 'statusDocumentId',
        type: 'string',
        default: '',
        required: true,
        displayOptions: {
          show: {
            operation: ['updateStatus'],
          },
        },
        description: 'ID of document to update',
        placeholder: 'doc-uuid-12345',
      },
      {
        displayName: 'Processing Status',
        name: 'processingStatus',
        type: 'options',
        options: [
          {
            name: 'Ready for Processing',
            value: 'ready',
            description: 'Document is ready for the next processing stage',
          },
          {
            name: 'Currently Processing',
            value: 'processing',
            description: 'Document is currently being processed',
          },
          {
            name: 'Processing Complete',
            value: 'completed',
            description: 'Processing stage completed successfully',
          },
          {
            name: 'Processing Failed',
            value: 'failed',
            description: 'Processing encountered an error',
          },
          {
            name: 'Final Complete',
            value: 'final_complete',
            description: 'All processing stages completed',
          },
        ],
        default: 'completed',
        required: true,
        displayOptions: {
          show: {
            operation: ['updateStatus'],
          },
        },
        description: 'New processing status for the document',
      },
      {
        displayName: 'Additional Metadata',
        name: 'additionalMetadata',
        type: 'json',
        default: '{}',
        displayOptions: {
          show: {
            operation: ['updateStatus'],
          },
        },
        description: 'Additional metadata to update (optional)',
        placeholder: '{"processing_time": 1.5, "summary_length": 150}',
      },
      // Batch Hierarchy operation parameters
      {
        displayName: 'Document IDs',
        name: 'documentIds',
        type: 'json',
        default: '[]',
        required: true,
        displayOptions: {
          show: {
            operation: ['batchHierarchy'],
          },
        },
        description: 'Array of document IDs to get hierarchy for',
        placeholder: '["doc-id-1", "doc-id-2", "doc-id-3"]',
      },
      {
        displayName: 'Include Parents',
        name: 'batchIncludeParents',
        type: 'boolean',
        default: true,
        displayOptions: {
          show: {
            operation: ['batchHierarchy'],
          },
        },
        description: 'Include parent documents in results',
      },
      {
        displayName: 'Include Children',
        name: 'batchIncludeChildren',
        type: 'boolean',
        default: true,
        displayOptions: {
          show: {
            operation: ['batchHierarchy'],
          },
        },
        description: 'Include child documents in results',
      },
      // Get Final Summary operation parameters
      {
        displayName: 'Workflow ID',
        name: 'workflowId',
        type: 'string',
        default: '',
        required: true,
        displayOptions: {
          show: {
            operation: ['getFinalSummary'],
          },
        },
        description: 'ID of the workflow to get final summary for',
        placeholder: 'workflow-uuid-12345',
      },
      // Get Complete Tree operation parameters
      {
        displayName: 'Workflow ID',
        name: 'treeWorkflowId',
        type: 'string',
        default: '',
        required: true,
        displayOptions: {
          show: {
            operation: ['getCompleteTree'],
          },
        },
        description: 'ID of the workflow to get tree structure for',
        placeholder: 'workflow-uuid-12345',
      },
      {
        displayName: 'Max Depth',
        name: 'treeMaxDepth',
        type: 'number',
        default: 5,
        displayOptions: {
          show: {
            operation: ['getCompleteTree'],
          },
        },
        description: 'Maximum tree depth to return (1-20)',
        typeOptions: {
          minValue: 1,
          maxValue: 20,
        },
      },
      {
        displayName: 'Include Content',
        name: 'treeIncludeContent',
        type: 'boolean',
        default: false,
        displayOptions: {
          show: {
            operation: ['getCompleteTree'],
          },
        },
        description: 'Whether to include full content in tree nodes',
      },
      // Get Document with Context operation parameters
      {
        displayName: 'Document ID',
        name: 'contextDocumentId',
        type: 'string',
        default: '',
        required: true,
        displayOptions: {
          show: {
            operation: ['getDocumentWithContext'],
          },
        },
        description: 'ID of the document to get with context',
        placeholder: 'doc-uuid-12345',
      },
      {
        displayName: 'Include Full Content',
        name: 'includeFullContent',
        type: 'boolean',
        default: true,
        displayOptions: {
          show: {
            operation: ['getDocumentWithContext'],
          },
        },
        description: 'Whether to include full document content or just preview',
      },
      {
        displayName: 'Include Siblings',
        name: 'includeSiblings',
        type: 'boolean',
        default: false,
        displayOptions: {
          show: {
            operation: ['getDocumentWithContext'],
          },
        },
        description: 'Whether to include sibling documents in response',
      },
      // Common parameters
      {
        displayName: 'Haystack Service URL',
        name: 'haystackUrl',
        type: 'string',
        default: 'http://haystack-service:8000',
        description: 'URL of the Haystack service',
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];
    const operation = this.getNodeParameter('operation', 0) as string;
    const haystackUrl = this.getNodeParameter('haystackUrl', 0) as string;

    for (let i = 0; i < items.length; i++) {
      try {
        let response: any;
        let endpoint: string;
        let method: string = 'POST';
        let body: any = {};

        switch (operation) {
          case 'ingest':
            endpoint = '/ingest';
            const documentsParam = this.getNodeParameter('documents', i);
            try {
              if (typeof documentsParam === 'string') {
                body = JSON.parse(documentsParam);
              } else {
                body = documentsParam;
              }
              if (!Array.isArray(body)) {
                body = [body];
              }
            } catch (error) {
              throw new NodeOperationError(this.getNode(), 'Invalid JSON in documents parameter');
            }
            break;

          case 'search':
            endpoint = '/search';
            body = {
              query: this.getNodeParameter('query', i) as string,
              top_k: this.getNodeParameter('topK', i) as number,
              include_hierarchy: this.getNodeParameter('includeHierarchy', i) as boolean,
            };
            
            const searchType = this.getNodeParameter('searchType', i) as string;
            if (searchType === 'hybrid') {
              body.use_hybrid = true;
            } else if (searchType === 'vector') {
              body.use_vector = true;
            } else if (searchType === 'bm25') {
              body.use_bm25 = true;
            }

            const filtersParam = this.getNodeParameter('filters', i);
            if (filtersParam) {
              try {
                if (typeof filtersParam === 'string' && filtersParam !== '{}') {
                  body.filters = JSON.parse(filtersParam);
                } else if (typeof filtersParam === 'object') {
                  body.filters = filtersParam;
                }
              } catch (error) {
                throw new NodeOperationError(this.getNode(), 'Invalid JSON in filters parameter');
              }
            }
            break;

          case 'hierarchy':
            endpoint = '/hierarchy';
            body = {
              document_id: this.getNodeParameter('documentId', i) as string,
              include_parents: this.getNodeParameter('includeParents', i) as boolean,
              include_children: this.getNodeParameter('includeChildren', i) as boolean,
              max_depth: this.getNodeParameter('maxDepth', i) as number,
            };
            break;

          case 'health':
            endpoint = '/health';
            method = 'GET';
            body = null;
            break;

          case 'getByStage':
            // VALIDATION: Stage type enum check
            const stageType = this.getNodeParameter('stageType', i) as string;
            const validStageTypes = ['ready_chunk', 'ready_summarize', 'ready_aggregate', 'completed'];
            if (!validStageTypes.includes(stageType)) {
              throw new NodeOperationError(
                this.getNode(),
                `Invalid stage type '${stageType}'. Must be one of: ${validStageTypes.join(', ')}`
              );
            }
            
            // VALIDATION: Hierarchy level bounds and type check
            const hierarchyLevel = this.getNodeParameter('hierarchyLevel', i);
            if (typeof hierarchyLevel !== 'number' || !Number.isInteger(hierarchyLevel)) {
              throw new NodeOperationError(
                this.getNode(),
                `Hierarchy level must be an integer, received: ${typeof hierarchyLevel}`
              );
            }
            if (hierarchyLevel < 0 || hierarchyLevel > 10) {
              throw new NodeOperationError(
                this.getNode(),
                `Invalid hierarchy level: ${hierarchyLevel}. Must be between 0 and 10.`
              );
            }
            
            endpoint = '/get_by_stage';
            body = {
              stage_type: stageType,
              hierarchy_level: hierarchyLevel,
            };
            break;

          case 'updateStatus':
            // VALIDATION: Document ID format check
            const documentId = this.getNodeParameter('statusDocumentId', i) as string;
            if (!documentId || documentId.trim().length === 0) {
              throw new NodeOperationError(this.getNode(), 'Document ID cannot be empty');
            }
            if (documentId.length < 8 || documentId.length > 100) {
              throw new NodeOperationError(
                this.getNode(),
                `Invalid document ID length: ${documentId.length}. Must be between 8-100 characters.`
              );
            }
            
            // VALIDATION: Processing status enum check
            const processingStatus = this.getNodeParameter('processingStatus', i) as string;
            const validStatuses = ['ready', 'processing', 'completed', 'failed', 'final_complete'];
            if (!validStatuses.includes(processingStatus)) {
              throw new NodeOperationError(
                this.getNode(),
                `Invalid processing status '${processingStatus}'. Must be one of: ${validStatuses.join(', ')}`
              );
            }
            
            endpoint = '/update_status';
            body = {
              document_id: documentId.trim(),
              processing_status: processingStatus,
            };
            
            // VALIDATION: Additional metadata JSON parsing
            const additionalMetadata = this.getNodeParameter('additionalMetadata', i);
            if (additionalMetadata) {
              try {
                let parsedMetadata;
                if (typeof additionalMetadata === 'string' && additionalMetadata !== '{}') {
                  parsedMetadata = JSON.parse(additionalMetadata);
                } else if (typeof additionalMetadata === 'object') {
                  parsedMetadata = additionalMetadata;
                }
                
                // SECURITY: Validate metadata structure
                if (parsedMetadata && typeof parsedMetadata === 'object') {
                  const metadataSize = JSON.stringify(parsedMetadata).length;
                  if (metadataSize > 10000) {
                    throw new NodeOperationError(
                      this.getNode(),
                      `Additional metadata too large: ${metadataSize} bytes. Maximum 10KB allowed.`
                    );
                  }
                  body.additional_metadata = parsedMetadata;
                }
              } catch (jsonError) {
                throw new NodeOperationError(
                  this.getNode(),
                  `Invalid JSON in additional metadata: ${jsonError instanceof Error ? jsonError.message : 'Unknown error'}`
                );
              }
            }
            break;

          case 'batchHierarchy':
            // VALIDATION: Document IDs array parsing and validation
            const documentIdsParam = this.getNodeParameter('documentIds', i);
            let documentIds: string[];
            
            try {
              if (typeof documentIdsParam === 'string') {
                if (documentIdsParam.trim() === '' || documentIdsParam.trim() === '[]') {
                  throw new NodeOperationError(this.getNode(), 'Document IDs array cannot be empty');
                }
                documentIds = JSON.parse(documentIdsParam);
              } else if (Array.isArray(documentIdsParam)) {
                documentIds = documentIdsParam as string[];
              } else {
                throw new NodeOperationError(
                  this.getNode(),
                  `Document IDs must be an array, received: ${typeof documentIdsParam}`
                );
              }
              
              // VALIDATION: Array content and size checks
              if (!Array.isArray(documentIds) || documentIds.length === 0) {
                throw new NodeOperationError(this.getNode(), 'Document IDs must be a non-empty array');
              }
              
              if (documentIds.length > 50) {
                throw new NodeOperationError(
                  this.getNode(),
                  `Too many document IDs: ${documentIds.length}. Maximum 50 allowed per batch.`
                );
              }
              
              // VALIDATION: Individual document ID format
              for (let idx = 0; idx < documentIds.length; idx++) {
                const docId = documentIds[idx];
                if (typeof docId !== 'string' || docId.trim().length === 0) {
                  throw new NodeOperationError(
                    this.getNode(),
                    `Invalid document ID at index ${idx}: must be non-empty string`
                  );
                }
                if (docId.length < 8 || docId.length > 100) {
                  throw new NodeOperationError(
                    this.getNode(),
                    `Invalid document ID at index ${idx}: length must be between 8-100 characters`
                  );
                }
                // Sanitize document ID
                documentIds[idx] = docId.trim();
              }
              
            } catch (parseError) {
              if (parseError instanceof NodeOperationError) {
                throw parseError;
              }
              throw new NodeOperationError(
                this.getNode(),
                `Failed to parse document IDs: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`
              );
            }
            
            endpoint = '/batch_hierarchy';
            body = {
              document_ids: documentIds,
              include_parents: this.getNodeParameter('batchIncludeParents', i) as boolean,
              include_children: this.getNodeParameter('batchIncludeChildren', i) as boolean,
            };
            break;

          case 'getFinalSummary':
            const workflowId = this.getNodeParameter('workflowId', i) as string;
            if (!workflowId || workflowId.trim().length === 0) {
              throw new NodeOperationError(this.getNode(), 'Workflow ID cannot be empty');
            }
            endpoint = `/get_final_summary/${encodeURIComponent(workflowId.trim())}`;
            method = 'GET';
            body = null;
            break;

          case 'getCompleteTree':
            const treeWorkflowId = this.getNodeParameter('treeWorkflowId', i) as string;
            if (!treeWorkflowId || treeWorkflowId.trim().length === 0) {
              throw new NodeOperationError(this.getNode(), 'Workflow ID cannot be empty');
            }
            const treeMaxDepth = this.getNodeParameter('treeMaxDepth', i) as number;
            const treeIncludeContent = this.getNodeParameter('treeIncludeContent', i) as boolean;
            
            endpoint = `/get_complete_tree/${encodeURIComponent(treeWorkflowId.trim())}`;
            method = 'GET';
            body = null;
            
            // Build query parameters
            const treeParams = new URLSearchParams();
            treeParams.append('max_depth', treeMaxDepth.toString());
            treeParams.append('include_content', treeIncludeContent.toString());
            endpoint += `?${treeParams.toString()}`;
            break;

          case 'getDocumentWithContext':
            const contextDocumentId = this.getNodeParameter('contextDocumentId', i) as string;
            if (!contextDocumentId || contextDocumentId.trim().length === 0) {
              throw new NodeOperationError(this.getNode(), 'Document ID cannot be empty');
            }
            const includeFullContent = this.getNodeParameter('includeFullContent', i) as boolean;
            const includeSiblings = this.getNodeParameter('includeSiblings', i) as boolean;
            
            endpoint = `/get_document_with_context/${encodeURIComponent(contextDocumentId.trim())}`;
            method = 'GET';
            body = null;
            
            // Build query parameters
            const contextParams = new URLSearchParams();
            contextParams.append('include_full_content', includeFullContent.toString());
            contextParams.append('include_siblings', includeSiblings.toString());
            endpoint += `?${contextParams.toString()}`;
            break;

          default:
            throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`);
        }

        // Make HTTP request using n8n's helpers
        const url = `${haystackUrl}${endpoint}`;
        
        try {
          const requestOptions: any = {
            method,
            headers: {
              'Content-Type': 'application/json',
            },
            json: true,
          };

          if (body && method !== 'GET') {
            requestOptions.body = body;
          }

          response = await this.helpers.httpRequest({
            ...requestOptions,
            url,
          });
        } catch (error) {
          if (error instanceof Error) {
            throw new NodeOperationError(
              this.getNode(),
              `Failed to connect to Haystack service at ${url}: ${error.message}`,
            );
          }
          throw error;
        }

        // Process response based on operation
        if (operation === 'search' && response.results) {
          // Return each search result as a separate item
          for (const result of response.results) {
            returnData.push({
              json: {
                ...result,
                _search_metadata: {
                  total_results: response.total_results,
                  search_type: response.search_type,
                  query: body.query,
                },
              },
            });
          }
        } else {
          // Return the entire response as a single item
          returnData.push({
            json: response as IDataObject,
          });
        }
      } catch (error) {
        if (this.continueOnFail()) {
          returnData.push({
            json: {
              error: error instanceof Error ? error.message : String(error),
            },
            pairedItem: i,
          });
          continue;
        }
        throw error;
      }
    }

    return [returnData];
  }
}