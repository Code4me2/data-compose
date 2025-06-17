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
            name: 'Import from Previous Node',
            value: 'importFromNode',
            description: 'Import hierarchical documents from previous node (e.g., PostgreSQL query)',
            action: 'Import documents into Elasticsearch',
          },
          {
            name: 'Search',
            value: 'search',
            description: 'Search documents using keyword, semantic, or hybrid methods',
            action: 'Search indexed documents',
          },
          {
            name: 'Get Hierarchy',
            value: 'hierarchy',
            description: 'Navigate parent-child relationships for a document',
            action: 'Explore document tree',
          },
          {
            name: 'Health Check',
            value: 'health',
            description: 'Verify Elasticsearch and API service connectivity',
            action: 'Check system status',
          },
          {
            name: 'Batch Hierarchy',
            value: 'batchHierarchy',
            description: 'Efficiently retrieve relationships for multiple documents',
            action: 'Batch hierarchy lookup',
          },
          {
            name: 'Get Final Summary',
            value: 'getFinalSummary',
            description: 'Retrieve the top-level summary for a workflow',
            action: 'Get final summary',
          },
          {
            name: 'Get Complete Tree',
            value: 'getCompleteTree',
            description: 'Visualize complete document hierarchy as a tree',
            action: 'Get document tree',
          },
          {
            name: 'Get Document with Context',
            value: 'getDocumentWithContext',
            description: 'Retrieve document with breadcrumb trail and siblings',
            action: 'Get document context',
          },
        ],
        default: 'importFromNode',
      },
      // Import operation parameters
      {
        displayName: 'Field Mapping',
        name: 'fieldMapping',
        type: 'collection',
        placeholder: 'Add Field Mapping',
        default: {
          contentField: 'content',
          summaryField: 'summary',
          idField: 'id',
          parentIdField: 'parent_id',
          childIdsField: 'child_ids',
          hierarchyLevelField: 'hierarchy_level',
          batchIdField: 'batch_id'
        },
        displayOptions: {
          show: {
            operation: ['importFromNode'],
          },
        },
        description: 'Map fields from previous node to document structure',
        options: [
          {
            displayName: 'Content Field Name',
            name: 'contentField',
            type: 'string',
            default: 'content',
            description: 'Field containing document content',
          },
          {
            displayName: 'Summary Field Name',
            name: 'summaryField',
            type: 'string',
            default: 'summary',
            description: 'Field containing document summary',
          },
          {
            displayName: 'ID Field Name',
            name: 'idField',
            type: 'string',
            default: 'id',
            description: 'Field containing document ID',
          },
          {
            displayName: 'Parent ID Field Name',
            name: 'parentIdField',
            type: 'string',
            default: 'parent_id',
            description: 'Field containing parent document ID',
          },
          {
            displayName: 'Child IDs Field Name',
            name: 'childIdsField',
            type: 'string',
            default: 'child_ids',
            description: 'Field containing array of child document IDs',
          },
          {
            displayName: 'Hierarchy Level Field Name',
            name: 'hierarchyLevelField',
            type: 'string',
            default: 'hierarchy_level',
            description: 'Field containing hierarchy level',
          },
          {
            displayName: 'Batch/Workflow ID Field Name',
            name: 'batchIdField',
            type: 'string',
            default: 'batch_id',
            description: 'Field containing batch or workflow ID',
          },
        ],
      },
      {
        displayName: 'Generate Embeddings',
        name: 'generateEmbeddings',
        type: 'boolean',
        default: true,
        displayOptions: {
          show: {
            operation: ['importFromNode'],
          },
        },
        description: 'Whether to generate embeddings for imported documents',
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
        placeholder: '{"document_type": "summary", "hierarchy_level": 2}',
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
          case 'importFromNode':
            endpoint = '/import_from_node';
            const fieldMapping = this.getNodeParameter('fieldMapping', i) as any;
            const generateEmbeddings = this.getNodeParameter('generateEmbeddings', i) as boolean;
            
            const inputData = items[i].json;
            const mappedDocument = {
              content: inputData[fieldMapping.contentField || 'content'] || '',
              summary: inputData[fieldMapping.summaryField || 'summary'] || '',
              document_id: String(inputData[fieldMapping.idField || 'id'] || ''),
              parent_id: inputData[fieldMapping.parentIdField || 'parent_id'] ? String(inputData[fieldMapping.parentIdField || 'parent_id']) : null,
              children_ids: inputData[fieldMapping.childIdsField || 'child_ids'] || [],
              hierarchy_level: inputData[fieldMapping.hierarchyLevelField || 'hierarchy_level'] || 0,
              workflow_id: inputData[fieldMapping.batchIdField || 'batch_id'] || '',
              metadata: {
                ...inputData,
                source_system: 'hierarchical_summarization',
                imported_at: new Date().toISOString(),
              },
              generate_embeddings: generateEmbeddings,
            };
            
            body = mappedDocument;
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


          case 'getFinalSummary':
            const workflowId = this.getNodeParameter('workflowId', i) as string;
            if (!workflowId?.trim()) {
              throw new NodeOperationError(this.getNode(), 'Workflow ID is required');
            }
            endpoint = `/get_final_summary/${encodeURIComponent(workflowId.trim())}`;
            method = 'GET';
            body = null;
            break;

          case 'getCompleteTree':
            const treeWorkflowId = this.getNodeParameter('treeWorkflowId', i) as string;
            if (!treeWorkflowId?.trim()) {
              throw new NodeOperationError(this.getNode(), 'Workflow ID is required');
            }
            const treeMaxDepth = this.getNodeParameter('treeMaxDepth', i) as number;
            const treeIncludeContent = this.getNodeParameter('treeIncludeContent', i) as boolean;
            
            endpoint = `/get_complete_tree/${encodeURIComponent(treeWorkflowId.trim())}`;
            method = 'GET';
            body = null;
            
            const treeParams = new URLSearchParams();
            treeParams.append('max_depth', treeMaxDepth.toString());
            treeParams.append('include_content', treeIncludeContent.toString());
            endpoint += `?${treeParams.toString()}`;
            break;

          case 'getDocumentWithContext':
            const contextDocumentId = this.getNodeParameter('contextDocumentId', i) as string;
            if (!contextDocumentId?.trim()) {
              throw new NodeOperationError(this.getNode(), 'Document ID is required');
            }
            const includeFullContent = this.getNodeParameter('includeFullContent', i) as boolean;
            const includeSiblings = this.getNodeParameter('includeSiblings', i) as boolean;
            
            endpoint = `/get_document_with_context/${encodeURIComponent(contextDocumentId.trim())}`;
            method = 'GET';
            body = null;
            
            const contextParams = new URLSearchParams();
            contextParams.append('include_full_content', includeFullContent.toString());
            contextParams.append('include_siblings', includeSiblings.toString());
            endpoint += `?${contextParams.toString()}`;
            break;

          default:
            throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`);
        }

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

        if (operation === 'search' && response.results) {
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