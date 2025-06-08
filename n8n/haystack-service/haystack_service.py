"""
Haystack FastAPI Service for Legal Document Analysis
Provides document ingestion, search, and hierarchy management capabilities
"""

import os
import logging
from datetime import datetime
from typing import List, Dict, Optional, Any
import uuid

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sentence_transformers import SentenceTransformer

from haystack import Pipeline, Document
from haystack.components.writers import DocumentWriter
from haystack.components.preprocessors import DocumentSplitter
from haystack.components.embedders import SentenceTransformersDocumentEmbedder, SentenceTransformersTextEmbedder
from haystack.components.retrievers import ElasticsearchBM25Retriever, ElasticsearchEmbeddingRetriever
from haystack.components.joiners import DocumentJoiner
from haystack.document_stores.elasticsearch import ElasticsearchDocumentStore
from haystack.document_stores.types import DuplicatePolicy

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Haystack Legal Document Service",
    description="API for legal document analysis with Haystack and Elasticsearch",
    version="0.1.0"
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
document_store: Optional[ElasticsearchDocumentStore] = None
embedding_model: Optional[SentenceTransformer] = None

# Pydantic models
class DocumentInput(BaseModel):
    content: str
    metadata: Dict[str, Any] = Field(default_factory=dict)
    document_type: str = "source_document"
    document_id: Optional[str] = None
    parent_id: Optional[str] = None
    hierarchy_level: int = 0

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

class IngestResponse(BaseModel):
    documents_processed: int
    document_ids: List[str]
    status: str = "success"

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


@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    global document_store, embedding_model
    
    try:
        # Initialize document store
        document_store = ElasticsearchDocumentStore(
            hosts=[ELASTICSEARCH_HOST],
            index=ELASTICSEARCH_INDEX,
            embedding_dim=384,
            similarity="cosine",
            recreate_index=False
        )
        logger.info(f"Connected to Elasticsearch at {ELASTICSEARCH_HOST}")
        
        # Load embedding model
        embedding_model = SentenceTransformer(EMBEDDING_MODEL)
        logger.info(f"Loaded embedding model: {EMBEDDING_MODEL}")
        
    except Exception as e:
        logger.error(f"Failed to initialize services: {str(e)}")
        raise


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Check service health and connectivity"""
    try:
        # Check Elasticsearch connection
        es_connected = False
        doc_count = 0
        
        if document_store:
            try:
                doc_count = document_store.count_documents()
                es_connected = True
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


@app.post("/ingest", response_model=IngestResponse)
async def ingest_documents(documents: List[DocumentInput]):
    """Ingest documents with hierarchy metadata"""
    if not document_store:
        raise HTTPException(status_code=503, detail="Document store not initialized")
    
    try:
        processed_docs = []
        document_ids = []
        
        # Create embedder for documents
        embedder = SentenceTransformersDocumentEmbedder(
            model=EMBEDDING_MODEL,
            progress_bar=False
        )
        
        for doc_input in documents:
            # Generate document ID if not provided
            doc_id = doc_input.document_id or str(uuid.uuid4())
            
            # Prepare metadata with hierarchy information
            metadata = doc_input.metadata.copy()
            metadata.update({
                "document_type": doc_input.document_type,
                "document_id": doc_id,
                "ingestion_timestamp": datetime.utcnow().isoformat(),
                "hierarchy": {
                    "level": doc_input.hierarchy_level,
                    "parent_id": doc_input.parent_id,
                    "children_ids": [],
                    "path": []
                }
            })
            
            # Create Haystack document
            doc = Document(
                id=doc_id,
                content=doc_input.content,
                meta=metadata
            )
            
            processed_docs.append(doc)
            document_ids.append(doc_id)
        
        # Generate embeddings
        embedded_docs = embedder.run(documents=processed_docs)["documents"]
        
        # Write to document store
        writer = DocumentWriter(
            document_store=document_store,
            policy=DuplicatePolicy.OVERWRITE
        )
        writer.run(documents=embedded_docs)
        
        # Update parent-child relationships if needed
        for doc in processed_docs:
            if doc.meta.get("hierarchy", {}).get("parent_id"):
                await _update_parent_children(doc.id, doc.meta["hierarchy"]["parent_id"])
        
        return IngestResponse(
            documents_processed=len(processed_docs),
            document_ids=document_ids
        )
        
    except Exception as e:
        logger.error(f"Ingestion failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Ingestion failed: {str(e)}")


@app.post("/search", response_model=SearchResponse)
async def search_documents(request: SearchRequest):
    """Search documents using hybrid, vector, or BM25 search"""
    if not document_store:
        raise HTTPException(status_code=503, detail="Document store not initialized")
    
    try:
        results = []
        search_type = "hybrid"
        
        if request.use_hybrid or (not request.use_vector and not request.use_bm25):
            # Hybrid search combining BM25 and vector search
            results = await _hybrid_search(
                request.query,
                request.top_k,
                request.filters
            )
            search_type = "hybrid"
            
        elif request.use_vector:
            # Pure vector search
            results = await _vector_search(
                request.query,
                request.top_k,
                request.filters
            )
            search_type = "vector"
            
        elif request.use_bm25:
            # Pure BM25 search
            results = await _bm25_search(
                request.query,
                request.top_k,
                request.filters
            )
            search_type = "bm25"
        
        # Format results
        formatted_results = []
        for doc in results:
            result = {
                "content": doc.content,
                "score": doc.score,
                "metadata": doc.meta
            }
            
            # Include hierarchy context if requested
            if request.include_hierarchy and doc.meta.get("document_id"):
                hierarchy_context = await _get_hierarchy_context(
                    doc.meta["document_id"],
                    include_parents=True,
                    include_children=True,
                    max_depth=2
                )
                result["hierarchy_context"] = hierarchy_context
            
            formatted_results.append(result)
        
        return SearchResponse(
            results=formatted_results,
            total_results=len(formatted_results),
            search_type=search_type,
            query=request.query
        )
        
    except Exception as e:
        logger.error(f"Search failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")


@app.post("/hierarchy", response_model=HierarchyResponse)
async def get_document_hierarchy(request: HierarchyRequest):
    """Get document hierarchy and relationships"""
    if not document_store:
        raise HTTPException(status_code=503, detail="Document store not initialized")
    
    try:
        # Get the main document
        main_doc = None
        filters = {"field": "document_id", "operator": "==", "value": request.document_id}
        docs = document_store.filter_documents(filters=filters)
        
        if docs:
            main_doc = docs[0]
        
        if not main_doc:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Get hierarchy context
        context = await _get_hierarchy_context(
            request.document_id,
            request.include_parents,
            request.include_children,
            request.max_depth
        )
        
        # Count total related documents
        total_related = sum(len(docs) for docs in context.values())
        
        return HierarchyResponse(
            document_id=request.document_id,
            document={
                "content": main_doc.content,
                "metadata": main_doc.meta
            },
            context=context,
            total_related=total_related
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Hierarchy retrieval failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Hierarchy retrieval failed: {str(e)}")


async def _hybrid_search(query: str, top_k: int, filters: Optional[Dict] = None) -> List[Document]:
    """Perform hybrid search combining BM25 and vector search"""
    # Create search pipeline
    pipeline = Pipeline()
    
    # Add BM25 retriever
    bm25_retriever = ElasticsearchBM25Retriever(
        document_store=document_store,
        top_k=top_k,
        filters=filters
    )
    pipeline.add_component("bm25_retriever", bm25_retriever)
    
    # Add vector retriever with embedder
    text_embedder = SentenceTransformersTextEmbedder(
        model=EMBEDDING_MODEL,
        progress_bar=False
    )
    pipeline.add_component("text_embedder", text_embedder)
    
    embedding_retriever = ElasticsearchEmbeddingRetriever(
        document_store=document_store,
        top_k=top_k,
        filters=filters
    )
    pipeline.add_component("embedding_retriever", embedding_retriever)
    
    # Add document joiner to combine results
    document_joiner = DocumentJoiner(
        join_mode="merge",
        weights=[0.5, 0.5],  # Equal weight to BM25 and vector search
        top_k=top_k
    )
    pipeline.add_component("document_joiner", document_joiner)
    
    # Connect components
    pipeline.connect("text_embedder.embedding", "embedding_retriever.query_embedding")
    pipeline.connect("bm25_retriever", "document_joiner")
    pipeline.connect("embedding_retriever", "document_joiner")
    
    # Run pipeline
    result = pipeline.run({
        "bm25_retriever": {"query": query},
        "text_embedder": {"text": query}
    })
    
    return result["document_joiner"]["documents"]


async def _vector_search(query: str, top_k: int, filters: Optional[Dict] = None) -> List[Document]:
    """Perform pure vector search"""
    # Create embedder
    text_embedder = SentenceTransformersTextEmbedder(
        model=EMBEDDING_MODEL,
        progress_bar=False
    )
    
    # Generate query embedding
    embedding = text_embedder.run(text=query)["embedding"]
    
    # Create retriever
    retriever = ElasticsearchEmbeddingRetriever(
        document_store=document_store,
        top_k=top_k,
        filters=filters
    )
    
    # Run search
    result = retriever.run(query_embedding=embedding)
    return result["documents"]


async def _bm25_search(query: str, top_k: int, filters: Optional[Dict] = None) -> List[Document]:
    """Perform pure BM25 search"""
    retriever = ElasticsearchBM25Retriever(
        document_store=document_store,
        top_k=top_k,
        filters=filters
    )
    
    result = retriever.run(query=query)
    return result["documents"]


async def _get_hierarchy_context(
    document_id: str,
    include_parents: bool,
    include_children: bool,
    max_depth: int
) -> Dict[str, List[Dict[str, Any]]]:
    """Get document hierarchy context"""
    context = {
        "parents": [],
        "children": [],
        "siblings": []
    }
    
    # Get the main document
    filters = {"field": "document_id", "operator": "==", "value": document_id}
    docs = document_store.filter_documents(filters=filters)
    
    if not docs:
        return context
    
    main_doc = docs[0]
    hierarchy = main_doc.meta.get("hierarchy", {})
    
    # Get parents
    if include_parents and hierarchy.get("parent_id"):
        parents = await _get_parents_recursive(
            hierarchy["parent_id"],
            max_depth - 1
        )
        context["parents"] = [
            {"content": doc.content, "metadata": doc.meta}
            for doc in parents
        ]
    
    # Get children
    if include_children:
        children = await _get_children_recursive(
            document_id,
            max_depth - 1
        )
        context["children"] = [
            {"content": doc.content, "metadata": doc.meta}
            for doc in children
        ]
    
    # Get siblings (documents with same parent)
    if hierarchy.get("parent_id"):
        sibling_filters = {
            "operator": "AND",
            "conditions": [
                {"field": "hierarchy.parent_id", "operator": "==", "value": hierarchy["parent_id"]},
                {"field": "document_id", "operator": "!=", "value": document_id}
            ]
        }
        siblings = document_store.filter_documents(filters=sibling_filters)
        context["siblings"] = [
            {"content": doc.content, "metadata": doc.meta}
            for doc in siblings[:5]  # Limit siblings to 5
        ]
    
    return context


async def _get_parents_recursive(parent_id: str, remaining_depth: int) -> List[Document]:
    """Recursively get parent documents"""
    if remaining_depth <= 0:
        return []
    
    filters = {"field": "document_id", "operator": "==", "value": parent_id}
    docs = document_store.filter_documents(filters=filters)
    
    if not docs:
        return []
    
    parent_doc = docs[0]
    result = [parent_doc]
    
    # Get grandparents
    if parent_doc.meta.get("hierarchy", {}).get("parent_id"):
        grandparents = await _get_parents_recursive(
            parent_doc.meta["hierarchy"]["parent_id"],
            remaining_depth - 1
        )
        result.extend(grandparents)
    
    return result


async def _get_children_recursive(document_id: str, remaining_depth: int) -> List[Document]:
    """Recursively get child documents"""
    if remaining_depth <= 0:
        return []
    
    filters = {"field": "hierarchy.parent_id", "operator": "==", "value": document_id}
    children = document_store.filter_documents(filters=filters)
    
    result = list(children)
    
    # Get grandchildren
    for child in children:
        if child.meta.get("document_id"):
            grandchildren = await _get_children_recursive(
                child.meta["document_id"],
                remaining_depth - 1
            )
            result.extend(grandchildren)
    
    return result


async def _update_parent_children(child_id: str, parent_id: str):
    """Update parent document to include child in children_ids"""
    try:
        # Get parent document
        filters = {"field": "document_id", "operator": "==", "value": parent_id}
        parent_docs = document_store.filter_documents(filters=filters)
        
        if parent_docs:
            parent_doc = parent_docs[0]
            hierarchy = parent_doc.meta.get("hierarchy", {})
            children_ids = hierarchy.get("children_ids", [])
            
            # Add child if not already present
            if child_id not in children_ids:
                children_ids.append(child_id)
                hierarchy["children_ids"] = children_ids
                parent_doc.meta["hierarchy"] = hierarchy
                
                # Update document in store
                document_store.write_documents(
                    documents=[parent_doc],
                    policy=DuplicatePolicy.OVERWRITE
                )
    except Exception as e:
        logger.warning(f"Failed to update parent-child relationship: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)