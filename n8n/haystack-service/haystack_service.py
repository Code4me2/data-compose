"""
Haystack FastAPI Service for Document Search & Retrieval
=======================================================

Provides search and retrieval capabilities for hierarchical documents in Elasticsearch.
Designed to work with n8n workflows for legal document analysis.

Key Features:
- Hybrid search combining BM25 and vector similarity
- Hierarchical document navigation and tree visualization
- Efficient batch operations for large document sets
- Direct Elasticsearch integration for optimal performance
"""

import os
import logging
from datetime import datetime
from typing import List, Dict, Optional, Any
import uuid
import json
import asyncio
import psutil
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, status, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, validator
from sentence_transformers import SentenceTransformer
from elasticsearch import Elasticsearch
import numpy as np

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Haystack Legal Document Service",
    description="API for legal document analysis with Elasticsearch",
    version="0.2.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
ELASTICSEARCH_HOST = os.getenv("ELASTICSEARCH_HOST", "http://elasticsearch:9200")
ELASTICSEARCH_INDEX = os.getenv("ELASTICSEARCH_INDEX", "judicial-documents")
EMBEDDING_MODEL = os.getenv("HAYSTACK_MODEL", "BAAI/bge-small-en-v1.5")

# Global instances
es_client: Optional[Elasticsearch] = None
embedding_model: Optional[SentenceTransformer] = None

# Pydantic models
class ImportDocumentInput(BaseModel):
    content: str
    summary: str = ""
    document_id: str
    parent_id: Optional[str] = None
    children_ids: List[str] = Field(default_factory=list)
    hierarchy_level: int = 0
    workflow_id: str
    metadata: Dict[str, Any] = Field(default_factory=dict)
    generate_embeddings: bool = True

class SearchRequest(BaseModel):
    query: str
    top_k: int = Field(default=10, ge=1, le=100)
    use_hybrid: bool = True
    use_vector: bool = False
    use_bm25: bool = False
    include_hierarchy: bool = False
    filters: Optional[Dict[str, Any]] = None

class HierarchyRequest(BaseModel):
    document_id: str
    include_parents: bool = True
    include_children: bool = True
    max_depth: int = Field(default=3, ge=1, le=10)

class ImportResponse(BaseModel):
    document_id: str
    status: str = "success"
    embeddings_generated: bool = False
    content_indexed: bool = False

class SearchResponse(BaseModel):
    results: List[Dict[str, Any]]
    total_results: int
    search_type: str
    query: str

class HierarchyResponse(BaseModel):
    document_id: str
    document: Optional[Dict[str, Any]]
    context: Dict[str, List[Dict[str, Any]]]
    total_related: int

class HealthResponse(BaseModel):
    status: str
    elasticsearch_connected: bool
    documents_indexed: int
    embedding_model_loaded: bool


class FinalSummaryResponse(BaseModel):
    """Response model for final summary retrieval"""
    workflow_id: str = Field(..., description="The workflow ID")
    final_summary: Dict[str, Any] = Field(..., description="The final summary document")
    tree_metadata: Dict[str, Any] = Field(..., description="Metadata about the summarization tree")
    navigation_context: Dict[str, Any] = Field(..., description="Navigation context for the document")
    status: str = Field(default="success", description="Response status")


@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    global es_client, embedding_model
    
    try:
        # Initialize Elasticsearch client
        es_client = Elasticsearch([ELASTICSEARCH_HOST])
        logger.info(f"Connected to Elasticsearch at {ELASTICSEARCH_HOST}")
        
        # Load embedding model
        embedding_model = SentenceTransformer(EMBEDDING_MODEL)
        logger.info(f"Loaded embedding model: {EMBEDDING_MODEL}")
        
        # Ensure index exists
        if not es_client.indices.exists(index=ELASTICSEARCH_INDEX):
            logger.warning(f"Index {ELASTICSEARCH_INDEX} does not exist. Run elasticsearch_setup.py first.")
        
    except Exception as e:
        logger.error(f"Failed to initialize services: {str(e)}")
        # Don't raise to allow service to start for debugging


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Check service health and connectivity"""
    try:
        # Check Elasticsearch connection
        es_connected = False
        doc_count = 0
        
        if es_client:
            try:
                # Ping Elasticsearch
                es_connected = es_client.ping()
                if es_connected and es_client.indices.exists(index=ELASTICSEARCH_INDEX):
                    result = es_client.count(index=ELASTICSEARCH_INDEX)
                    doc_count = result.get('count', 0)
            except:
                pass
        
        return HealthResponse(
            status="healthy" if es_connected else "degraded",
            elasticsearch_connected=es_connected,
            documents_indexed=doc_count,
            embedding_model_loaded=embedding_model is not None
        )
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        raise HTTPException(status_code=503, detail="Service unavailable")


@app.post("/import_from_node", response_model=ImportResponse)
async def import_document(document: ImportDocumentInput):
    """Import single document from hierarchical summarization"""
    if not es_client:
        raise HTTPException(status_code=503, detail="Elasticsearch not initialized")
    
    try:
        # Determine content to index (prefer summary over content for search)
        content_to_index = document.summary if document.summary else document.content
        
        # Generate embedding if requested and model is available
        embedding = None
        embeddings_generated = False
        
        if document.generate_embeddings and embedding_model and content_to_index:
            try:
                embedding = embedding_model.encode(content_to_index)
                embeddings_generated = True
            except Exception as embed_error:
                logger.warning(f"Embedding generation failed for document {document.document_id}: {embed_error}")
                # Continue without embeddings rather than failing
        
        # Determine if this is a final summary document
        # Final summaries typically have no children and are at the highest levels
        is_final_summary = (
            len(document.children_ids) == 0 and 
            document.hierarchy_level >= 2 and
            bool(document.summary)
        )
        
        # Create Elasticsearch document structure
        es_doc = {
            "content": document.content,
            "summary": document.summary,
            "document_id": document.document_id,
            "import_timestamp": datetime.utcnow().isoformat(),
            
            # Add is_final_summary as top-level field for query compatibility
            "is_final_summary": is_final_summary,
            
            # Hierarchy structure for tree navigation
            "hierarchy": {
                "level": document.hierarchy_level,
                "parent_id": document.parent_id,
                "children_ids": document.children_ids,
                "is_root": document.parent_id is None,
                "is_leaf": len(document.children_ids) == 0
            },
            
            # Workflow context
            "workflow": {
                "workflow_id": document.workflow_id,
                "import_source": "hierarchical_summarization",
                "is_final_summary": is_final_summary  # Also store in workflow for consistency
            },
            
            # Enhanced metadata
            "metadata": {
                **document.metadata,
                "content_stats": {
                    "content_length": len(document.content),
                    "summary_length": len(document.summary),
                    "has_summary": bool(document.summary)
                }
            }
        }
        
        # Add embedding if generated
        if embedding is not None:
            es_doc["embedding"] = embedding.tolist()
        
        # Index document
        try:
            es_client.index(
                index=ELASTICSEARCH_INDEX,
                id=document.document_id,
                body=es_doc,
                refresh=True
            )
            content_indexed = True
            
        except Exception as index_error:
            logger.error(f"Elasticsearch indexing failed for document {document.document_id}: {index_error}")
            raise HTTPException(
                status_code=500, 
                detail=f"Failed to index document {document.document_id}: {str(index_error)}"
            )
        
        return ImportResponse(
            document_id=document.document_id,
            embeddings_generated=embeddings_generated,
            content_indexed=content_indexed
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Import failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")


@app.post("/search", response_model=SearchResponse)
async def search_documents(request: SearchRequest):
    """Search documents using hybrid, vector, or BM25 search"""
    if not es_client:
        raise HTTPException(status_code=503, detail="Elasticsearch not initialized")
    
    if not embedding_model and (request.use_vector or request.use_hybrid):
        raise HTTPException(status_code=503, detail="Embedding model not initialized")
    
    try:
        results = []
        search_type = "hybrid"
        
        # Build base query
        query_body = {
            "size": request.top_k,
            "_source": True
        }
        
        # Add filters if provided
        filter_conditions = []
        if request.filters:
            for field, value in request.filters.items():
                filter_conditions.append({"term": {field: value}})
        
        if request.use_bm25 and not request.use_vector:
            # Pure BM25 search
            search_type = "bm25"
            query_body["query"] = {
                "bool": {
                    "must": [
                        {"match": {"content": request.query}}
                    ],
                    "filter": filter_conditions
                }
            }
            
        elif request.use_vector and not request.use_bm25:
            # Pure vector search
            search_type = "vector"
            query_embedding = embedding_model.encode(request.query)
            
            script_query = {
                "script_score": {
                    "query": {"bool": {"filter": filter_conditions}} if filter_conditions else {"match_all": {}},
                    "script": {
                        "source": "cosineSimilarity(params.query_vector, 'embedding') + 1.0",
                        "params": {"query_vector": query_embedding.tolist()}
                    }
                }
            }
            query_body["query"] = script_query
            
        else:
            # Hybrid search (default)
            search_type = "hybrid"
            query_embedding = embedding_model.encode(request.query)
            
            # Combine BM25 and vector scores
            query_body["query"] = {
                "bool": {
                    "should": [
                        {
                            "match": {
                                "content": {
                                    "query": request.query,
                                    "boost": 0.5
                                }
                            }
                        },
                        {
                            "script_score": {
                                "query": {"match_all": {}},
                                "script": {
                                    "source": "cosineSimilarity(params.query_vector, 'embedding') + 1.0",
                                    "params": {"query_vector": query_embedding.tolist()}
                                },
                                "boost": 0.5
                            }
                        }
                    ],
                    "filter": filter_conditions
                }
            }
        
        # Execute search
        search_result = es_client.search(index=ELASTICSEARCH_INDEX, body=query_body)
        
        # Process results
        for hit in search_result['hits']['hits']:
            source = hit['_source']
            
            # Prefer summary over content for display (imported from HS)
            display_content = source.get('summary', '') or source.get('content', '')
            
            result = {
                "content": display_content,
                "original_content": source.get('content', ''),
                "summary": source.get('summary', ''),
                "score": hit['_score'],
                "document_id": source.get('document_id', hit['_id']),
                "metadata": source.get('metadata', {})
            }
            
            # Include hierarchy context if requested
            if request.include_hierarchy:
                result['hierarchy'] = source.get('hierarchy', {})
            
            # Include workflow context
            if 'workflow' in source:
                result['workflow'] = source['workflow']
            
            results.append(result)
        
        return SearchResponse(
            results=results,
            total_results=len(results),
            search_type=search_type,
            query=request.query
        )
        
    except Exception as e:
        logger.error(f"Search failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")


@app.post("/hierarchy", response_model=HierarchyResponse)
async def get_document_hierarchy(request: HierarchyRequest):
    """Get document hierarchy and relationships"""
    if not es_client:
        raise HTTPException(status_code=503, detail="Elasticsearch not initialized")
    
    try:
        # Get the main document
        try:
            main_result = es_client.get(index=ELASTICSEARCH_INDEX, id=request.document_id)
            main_doc = main_result['_source']
        except:
            raise HTTPException(status_code=404, detail="Document not found")
        
        context = {
            "parents": [],
            "children": [],
            "siblings": []
        }
        
        hierarchy = main_doc.get('hierarchy', {})
        
        # Get parents
        if request.include_parents and hierarchy.get('parent_id'):
            try:
                parent_result = es_client.get(index=ELASTICSEARCH_INDEX, id=hierarchy['parent_id'])
                parent_doc = parent_result['_source']
                parent_info = {
                    "content": parent_doc['content'],
                    "metadata": parent_doc.get('metadata', {})
                }
                if 'workflow' in parent_doc:
                    parent_info['workflow'] = parent_doc['workflow']
                context['parents'].append(parent_info)
            except:
                logger.warning(f"Parent document not found: {hierarchy['parent_id']}")
        
        # Get children
        if request.include_children and hierarchy.get('children_ids'):
            for child_id in hierarchy['children_ids'][:request.max_depth]:
                try:
                    child_result = es_client.get(index=ELASTICSEARCH_INDEX, id=child_id)
                    child_doc = child_result['_source']
                    child_info = {
                        "content": child_doc['content'],
                        "metadata": child_doc.get('metadata', {})
                    }
                    if 'workflow' in child_doc:
                        child_info['workflow'] = child_doc['workflow']
                    context['children'].append(child_info)
                except:
                    logger.warning(f"Child document not found: {child_id}")
        
        # Count total related documents
        total_related = len(context['parents']) + len(context['children']) + len(context['siblings'])
        
        main_doc_info = {
            "content": main_doc['content'],
            "metadata": main_doc.get('metadata', {})
        }
        if 'workflow' in main_doc:
            main_doc_info['workflow'] = main_doc['workflow']
        
        return HierarchyResponse(
            document_id=request.document_id,
            document=main_doc_info,
            context=context,
            total_related=total_related
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Hierarchy retrieval failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Hierarchy retrieval failed: {str(e)}")








@app.get("/get_final_summary/{workflow_id}", response_model=FinalSummaryResponse)
async def get_final_summary(workflow_id: str):
    """
    Get the final summary document for a given workflow ID.
    
    This endpoint:
    1. Finds the final summary document for the workflow
    2. Returns UI-optimized JSON with content preview and full content
    3. Includes tree metadata (total documents, level counts, max depth)
    4. Includes navigation context (is_root, has_children, children_ids)
    5. Provides comprehensive error handling
    
    Args:
        workflow_id: The workflow ID to retrieve the final summary for
        
    Returns:
        FinalSummaryResponse with final summary, tree metadata, and navigation context
        
    Raises:
        404: If no final summary is found for the workflow
        409: If multiple final summaries exist for the workflow
        500: For other server errors
    """
    try:
        # Query for final summary document
        final_summary_query = {
            "query": {
                "bool": {
                    "must": [
                        {"term": {"workflow.workflow_id": workflow_id}},
                        {"term": {"is_final_summary": True}}
                    ]
                }
            },
            "size": 2  # Get 2 to check for duplicates
        }
        
        result = es_client.search(index=ELASTICSEARCH_INDEX, body=final_summary_query)
        hits = result['hits']['hits']
        
        # Handle no results
        if not hits:
            raise HTTPException(
                status_code=404,
                detail=f"No final summary found for workflow_id: {workflow_id}"
            )
        
        # Handle multiple final summaries (data integrity issue)
        if len(hits) > 1:
            raise HTTPException(
                status_code=409,
                detail=f"Multiple final summaries found for workflow_id: {workflow_id}. Data integrity issue."
            )
        
        # Extract the final summary document
        final_doc = hits[0]['_source']
        doc_id = final_doc.get('document_id', hits[0]['_id'])
        
        # Get tree statistics using aggregations
        tree_stats_query = {
            "query": {
                "term": {"workflow.workflow_id": workflow_id}
            },
            "size": 0,
            "aggs": {
                "total_documents": {
                    "value_count": {"field": "document_id"}
                },
                "document_types": {
                    "terms": {"field": "document_type.keyword"}
                },
                "hierarchy_levels": {
                    "terms": {"field": "hierarchy.level"}
                },
                "max_depth": {
                    "max": {"field": "hierarchy.level"}
                },
                "summary_types": {
                    "terms": {"field": "summary_type.keyword"}
                }
            }
        }
        
        stats_result = es_client.search(index=ELASTICSEARCH_INDEX, body=tree_stats_query)
        aggs = stats_result['aggregations']
        
        # Build tree metadata
        tree_metadata = {
            "total_documents": aggs['total_documents']['value'],
            "max_depth": int(aggs['max_depth']['value']) if aggs['max_depth']['value'] is not None else 0,
            "document_types": {
                bucket['key']: bucket['doc_count'] 
                for bucket in aggs['document_types']['buckets']
            },
            "level_distribution": {
                str(bucket['key']): bucket['doc_count'] 
                for bucket in aggs['hierarchy_levels']['buckets']
            },
            "summary_types": {
                bucket['key']: bucket['doc_count'] 
                for bucket in aggs['summary_types']['buckets']
            }
        }
        
        # Build navigation context
        hierarchy_info = final_doc.get('hierarchy', {})
        navigation_context = {
            "is_root": hierarchy_info.get('parent_id') is None,
            "has_children": bool(hierarchy_info.get('children_ids')),
            "children_ids": hierarchy_info.get('children_ids', []),
            "parent_id": hierarchy_info.get('parent_id'),
            "hierarchy_level": hierarchy_info.get('level', 0),
            "total_children": len(hierarchy_info.get('children_ids', []))
        }
        
        # Build final summary response
        content = final_doc.get('content', '')
        final_summary = {
            "document_id": doc_id,
            "content_preview": content[:500] + "..." if len(content) > 500 else content,
            "content_full": content,
            "content_length": len(content),
            "document_type": final_doc.get('document_type', 'unknown'),
            "summary_type": final_doc.get('summary_type', 'final_summary'),
            "metadata": final_doc.get('metadata', {}),
            "created_at": final_doc.get('metadata', {}).get('created_at'),
            "processing_status": final_doc.get('metadata', {}).get('processing_status', 'unknown')
        }
        
        return FinalSummaryResponse(
            workflow_id=workflow_id,
            final_summary=final_summary,
            tree_metadata=tree_metadata,
            navigation_context=navigation_context,
            status="success"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to retrieve final summary for workflow {workflow_id}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve final summary: {str(e)}"
        )


class TreeNode(BaseModel):
    """
    Recursive tree node model for hierarchical document representation.
    Optimized for UI rendering with lazy loading support.
    """
    document_id: str = Field(..., description="Unique document identifier")
    content: Optional[str] = Field(None, description="Document content (optional based on include_content)")
    content_preview: Optional[str] = Field(None, description="Truncated content preview")
    content_length: int = Field(..., description="Full content length in characters")
    document_type: str = Field(..., description="Type of document (e.g., source_document, chunk_summary)")
    summary_type: Optional[str] = Field(None, description="Summary type if applicable")
    hierarchy_level: int = Field(..., description="Level in the document hierarchy")
    processing_status: str = Field(..., description="Current processing status")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")
    
    # Tree structure
    children: List['TreeNode'] = Field(default_factory=list, description="Child nodes")
    has_children: bool = Field(..., description="Whether this node has children")
    is_expanded: bool = Field(default=False, description="UI hint for expansion state")
    
    # Navigation helpers
    parent_id: Optional[str] = Field(None, description="Parent document ID")
    is_root: bool = Field(..., description="Whether this is a root node")
    is_leaf: bool = Field(..., description="Whether this is a leaf node")
    
    class Config:
        schema_extra = {
            "example": {
                "document_id": "123e4567-e89b-12d3-a456-426614174000",
                "content_preview": "This is a summary of...",
                "content_length": 2500,
                "document_type": "chunk_summary",
                "hierarchy_level": 2,
                "processing_status": "completed",
                "children": [],
                "has_children": False,
                "is_root": False,
                "is_leaf": True
            }
        }


# Enable forward reference for recursive model
TreeNode.model_rebuild()


class CompleteTreeResponse(BaseModel):
    """Response model for complete tree structure"""
    workflow_id: str = Field(..., description="The workflow ID")
    tree: List[TreeNode] = Field(..., description="Root nodes of the tree")
    tree_metadata: Dict[str, Any] = Field(..., description="Metadata about the tree structure")
    query_metadata: Dict[str, Any] = Field(..., description="Information about the query")
    status: str = Field(default="success", description="Response status")


@app.get("/get_complete_tree/{workflow_id}", response_model=CompleteTreeResponse)
async def get_complete_tree(
    workflow_id: str,
    max_depth: int = Query(default=5, ge=1, le=20, description="Maximum tree depth to return"),
    include_content: bool = Query(default=False, description="Include full content in nodes")
):
    """
    Get the complete hierarchical tree structure for a workflow.
    
    This endpoint builds a recursive tree structure optimized for UI rendering,
    with support for depth limiting and content inclusion control.
    
    Args:
        workflow_id: The workflow ID to build the tree for
        max_depth: Maximum depth of tree to return (1-20, default 5)
        include_content: Whether to include full content or just previews
        
    Returns:
        CompleteTreeResponse with recursive tree structure and metadata
        
    Raises:
        404: If no documents found for the workflow
        500: For server errors
    """
    if not es_client:
        raise HTTPException(status_code=503, detail="Elasticsearch not initialized")
    
    try:
        # First, get all documents for the workflow
        all_docs_query = {
            "query": {
                "term": {"workflow.workflow_id": workflow_id}
            },
            "size": 10000,  # Adjust based on expected workflow sizes
            "_source": {
                "excludes": ["embedding"] if not include_content else ["embedding"]
            }
        }
        
        result = es_client.search(index=ELASTICSEARCH_INDEX, body=all_docs_query)
        hits = result['hits']['hits']
        
        if not hits:
            raise HTTPException(
                status_code=404,
                detail=f"No documents found for workflow_id: {workflow_id}"
            )
        
        # Build document lookup map
        doc_map = {}
        root_nodes = []
        
        for hit in hits:
            doc = hit['_source']
            doc_id = doc.get('document_id', hit['_id'])
            doc_map[doc_id] = {
                'doc': doc,
                'children': [],
                'processed': False
            }
            
            # Identify root nodes
            hierarchy = doc.get('hierarchy', {})
            if hierarchy.get('parent_id') is None:
                root_nodes.append(doc_id)
        
        # Build parent-child relationships
        for doc_id, doc_info in doc_map.items():
            doc = doc_info['doc']
            hierarchy = doc.get('hierarchy', {})
            parent_id = hierarchy.get('parent_id')
            
            if parent_id and parent_id in doc_map:
                doc_map[parent_id]['children'].append(doc_id)
        
        def build_tree_node(doc_id: str, current_depth: int = 0) -> Optional[TreeNode]:
            """Recursively build tree nodes with depth limiting and error handling"""
            if doc_id not in doc_map:
                logger.warning(f"Document {doc_id} not found in map")
                return None
            
            if current_depth > max_depth:
                return None
            
            doc_info = doc_map[doc_id]
            if doc_info['processed']:
                # Prevent cycles
                logger.warning(f"Cycle detected at document {doc_id}")
                return None
            
            doc_info['processed'] = True
            doc = doc_info['doc']
            content = doc.get('content', '')
            hierarchy = doc.get('hierarchy', {})
            metadata = doc.get('metadata', {})
            
            # Build child nodes recursively
            child_nodes = []
            if current_depth < max_depth:
                for child_id in doc_info['children']:
                    child_node = build_tree_node(child_id, current_depth + 1)
                    if child_node:
                        child_nodes.append(child_node)
            
            # Create tree node
            node = TreeNode(
                document_id=doc_id,
                content=content if include_content else None,
                content_preview=content[:200] + "..." if len(content) > 200 else content,
                content_length=len(content),
                document_type=doc.get('document_type', 'unknown'),
                summary_type=doc.get('workflow', {}).get('summary_type'),
                hierarchy_level=hierarchy.get('level', 0),
                processing_status=metadata.get('processing_status', 'unknown'),
                metadata={
                    'created_at': metadata.get('created_at'),
                    'updated_at': metadata.get('updated_at'),
                    'word_count': metadata.get('content_stats', {}).get('word_count', 0),
                    'is_final_summary': doc.get('workflow', {}).get('is_final_summary', False)
                },
                children=child_nodes,
                has_children=len(doc_info['children']) > 0,
                is_expanded=current_depth < 2,  # Auto-expand first two levels
                parent_id=hierarchy.get('parent_id'),
                is_root=hierarchy.get('parent_id') is None,
                is_leaf=len(doc_info['children']) == 0
            )
            
            return node
        
        # Build trees starting from root nodes
        trees = []
        for root_id in root_nodes:
            root_node = build_tree_node(root_id)
            if root_node:
                trees.append(root_node)
        
        # Calculate tree metadata
        total_nodes = len(doc_map)
        max_actual_depth = 0
        node_type_counts = {}
        
        def calculate_tree_stats(node: TreeNode, depth: int = 0):
            nonlocal max_actual_depth, node_type_counts
            
            max_actual_depth = max(max_actual_depth, depth)
            node_type = node.document_type
            node_type_counts[node_type] = node_type_counts.get(node_type, 0) + 1
            
            for child in node.children:
                calculate_tree_stats(child, depth + 1)
        
        for tree in trees:
            calculate_tree_stats(tree)
        
        tree_metadata = {
            "total_nodes": total_nodes,
            "root_count": len(trees),
            "max_depth_found": max_actual_depth,
            "max_depth_returned": min(max_actual_depth, max_depth),
            "node_type_distribution": node_type_counts,
            "truncated": max_actual_depth > max_depth
        }
        
        query_metadata = {
            "workflow_id": workflow_id,
            "max_depth_requested": max_depth,
            "include_content": include_content,
            "nodes_returned": sum(1 for _ in doc_map.values() if _['processed'])
        }
        
        return CompleteTreeResponse(
            workflow_id=workflow_id,
            tree=trees,
            tree_metadata=tree_metadata,
            query_metadata=query_metadata,
            status="success"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to build tree for workflow {workflow_id}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to build tree structure: {str(e)}"
        )


class BreadcrumbItem(BaseModel):
    """Single breadcrumb item in navigation path"""
    document_id: str = Field(..., description="Document ID")
    content_preview: str = Field(..., description="Short content preview")
    document_type: str = Field(..., description="Type of document")
    hierarchy_level: int = Field(..., description="Level in hierarchy")
    
    
class DocumentContextInfo(BaseModel):
    """Sibling document information"""
    document_id: str = Field(..., description="Document ID")
    content_preview: str = Field(..., description="Short content preview")
    document_type: str = Field(..., description="Type of document")
    processing_status: str = Field(..., description="Processing status")
    position: int = Field(..., description="Position among siblings")
    

class DocumentContentResponse(BaseModel):
    """Response model for document with comprehensive navigation context"""
    # Document information
    document_id: str = Field(..., description="Document ID")
    content: str = Field(..., description="Full document content if requested")
    content_preview: str = Field(..., description="Document content preview")
    content_length: int = Field(..., description="Full content length")
    document_type: str = Field(..., description="Type of document")
    summary_type: Optional[str] = Field(None, description="Summary type if applicable")
    processing_status: str = Field(..., description="Processing status")
    metadata: Dict[str, Any] = Field(..., description="Document metadata")
    
    # Hierarchy information
    hierarchy_level: int = Field(..., description="Level in hierarchy")
    parent_id: Optional[str] = Field(None, description="Parent document ID")
    children_ids: List[str] = Field(..., description="Child document IDs")
    
    # Navigation helpers
    has_parent: bool = Field(..., description="Whether document has a parent")
    has_children: bool = Field(..., description="Whether document has children")
    is_root: bool = Field(..., description="Whether document is a root node")
    is_leaf: bool = Field(..., description="Whether document is a leaf node")
    
    # Breadcrumb navigation
    breadcrumb_path: List[BreadcrumbItem] = Field(..., description="Path from root to current document")
    
    # Sibling information
    siblings: Optional[List[DocumentContextInfo]] = Field(None, description="Sibling documents if requested")
    sibling_position: Optional[int] = Field(None, description="Position among siblings")
    total_siblings: Optional[int] = Field(None, description="Total number of siblings")
    
    # Workflow context
    workflow_id: Optional[str] = Field(None, description="Workflow ID")
    is_final_summary: bool = Field(False, description="Whether this is a final summary")
    
    # Response metadata
    status: str = Field(default="success", description="Response status")
    query_time_ms: int = Field(..., description="Query execution time in milliseconds")


@app.get("/get_document_with_context/{document_id}", response_model=DocumentContentResponse)
async def get_document_with_context(
    document_id: str,
    include_full_content: bool = Query(default=True, description="Include full document content"),
    include_siblings: bool = Query(default=False, description="Include sibling documents")
):
    """
    Get document content with comprehensive tree navigation context.
    
    This endpoint provides:
    1. Document content (preview or full based on parameter)
    2. Complete breadcrumb path from root to current document
    3. Navigation helpers (has_parent, has_children, is_root, is_leaf)
    4. Optional sibling information with position tracking
    5. Workflow context and metadata
    
    Perfect for building UI navigation components with full context awareness.
    
    Args:
        document_id: The document ID to retrieve
        include_full_content: Whether to include full content (default: True)
        include_siblings: Whether to include sibling documents (default: False)
        
    Returns:
        DocumentContentResponse with comprehensive navigation context
        
    Raises:
        404: If document not found
        500: For server errors
    """
    if not es_client:
        raise HTTPException(status_code=503, detail="Elasticsearch not initialized")
    
    start_time = asyncio.get_event_loop().time()
    
    try:
        # Get the main document
        try:
            doc_result = es_client.get(index=ELASTICSEARCH_INDEX, id=document_id)
            main_doc = doc_result['_source']
        except:
            raise HTTPException(
                status_code=404, 
                detail=f"Document not found: {document_id}"
            )
        
        # Extract document information
        content = main_doc.get('content', '')
        hierarchy = main_doc.get('hierarchy', {})
        metadata = main_doc.get('metadata', {})
        workflow = main_doc.get('workflow', {})
        
        # Build breadcrumb path by traversing up to root
        breadcrumb_path = []
        current_id = document_id
        visited_ids = set()  # Prevent infinite loops
        
        while current_id:
            # Prevent cycles
            if current_id in visited_ids:
                logger.warning(f"Cycle detected in breadcrumb path at {current_id}")
                break
            visited_ids.add(current_id)
            
            # Get current document in path
            try:
                if current_id == document_id:
                    # Use already fetched document
                    path_doc = main_doc
                else:
                    path_result = es_client.get(index=ELASTICSEARCH_INDEX, id=current_id)
                    path_doc = path_result['_source']
                
                # Add to breadcrumb (will reverse later)
                breadcrumb_item = BreadcrumbItem(
                    document_id=current_id,
                    content_preview=path_doc['content'][:100] + "..." if len(path_doc['content']) > 100 else path_doc['content'],
                    document_type=path_doc.get('document_type', 'unknown'),
                    hierarchy_level=path_doc.get('hierarchy', {}).get('level', 0)
                )
                breadcrumb_path.append(breadcrumb_item)
                
                # Move to parent
                current_id = path_doc.get('hierarchy', {}).get('parent_id')
                
            except Exception as e:
                logger.warning(f"Failed to get breadcrumb document {current_id}: {e}")
                break
        
        # Reverse breadcrumb path to go from root to current
        breadcrumb_path.reverse()
        
        # Handle sibling information if requested
        siblings = None
        sibling_position = None
        total_siblings = None
        
        if include_siblings and hierarchy.get('parent_id'):
            try:
                # Get parent to find all siblings
                parent_result = es_client.get(index=ELASTICSEARCH_INDEX, id=hierarchy['parent_id'])
                parent_doc = parent_result['_source']
                sibling_ids = parent_doc.get('hierarchy', {}).get('children_ids', [])
                
                if sibling_ids:
                    # Get all siblings in a single query
                    siblings_query = {
                        "query": {
                            "terms": {"document_id": sibling_ids}
                        },
                        "size": len(sibling_ids),
                        "_source": ["content", "document_type", "metadata.processing_status", "document_id"]
                    }
                    
                    siblings_result = es_client.search(index=ELASTICSEARCH_INDEX, body=siblings_query)
                    
                    # Build sibling list
                    siblings = []
                    sibling_docs = {}
                    
                    for hit in siblings_result['hits']['hits']:
                        sibling_doc = hit['_source']
                        sibling_id = sibling_doc.get('document_id', hit['_id'])
                        sibling_docs[sibling_id] = sibling_doc
                    
                    # Maintain order from parent's children_ids
                    for idx, sibling_id in enumerate(sibling_ids):
                        if sibling_id in sibling_docs:
                            sibling_doc = sibling_docs[sibling_id]
                            
                            # Track position of current document
                            if sibling_id == document_id:
                                sibling_position = idx
                            
                            sibling_info = DocumentContextInfo(
                                document_id=sibling_id,
                                content_preview=sibling_doc['content'][:200] + "..." if len(sibling_doc['content']) > 200 else sibling_doc['content'],
                                document_type=sibling_doc.get('document_type', 'unknown'),
                                processing_status=sibling_doc.get('metadata', {}).get('processing_status', 'unknown'),
                                position=idx
                            )
                            siblings.append(sibling_info)
                    
                    total_siblings = len(siblings)
                    
            except Exception as e:
                logger.warning(f"Failed to get sibling information: {e}")
                # Continue without sibling info
        
        # Calculate navigation helpers
        has_parent = hierarchy.get('parent_id') is not None
        has_children = bool(hierarchy.get('children_ids'))
        is_root = not has_parent
        is_leaf = not has_children
        
        # Calculate query time
        query_time_ms = int((asyncio.get_event_loop().time() - start_time) * 1000)
        
        # Build response
        response = DocumentContentResponse(
            document_id=document_id,
            content=content if include_full_content else "",
            content_preview=content[:500] + "..." if len(content) > 500 else content,
            content_length=len(content),
            document_type=main_doc.get('document_type', 'unknown'),
            summary_type=workflow.get('summary_type'),
            processing_status=metadata.get('processing_status', 'unknown'),
            metadata={
                'created_at': metadata.get('created_at'),
                'updated_at': metadata.get('updated_at'),
                'last_updated': metadata.get('last_updated'),
                'content_stats': metadata.get('content_stats', {}),
                'tree_metadata': metadata.get('tree_metadata', {})
            },
            hierarchy_level=hierarchy.get('level', 0),
            parent_id=hierarchy.get('parent_id'),
            children_ids=hierarchy.get('children_ids', []),
            has_parent=has_parent,
            has_children=has_children,
            is_root=is_root,
            is_leaf=is_leaf,
            breadcrumb_path=breadcrumb_path,
            siblings=siblings,
            sibling_position=sibling_position,
            total_siblings=total_siblings,
            workflow_id=workflow.get('workflow_id'),
            is_final_summary=workflow.get('is_final_summary', False),
            status="success",
            query_time_ms=query_time_ms
        )
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get document with context for {document_id}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve document context: {str(e)}"
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)