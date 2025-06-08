import requests
import json
import time

def test_haystack_service():
    """Test the Haystack service integration"""
    base_url = "http://localhost:8000"
    
    print("🧪 Testing Haystack Elasticsearch Integration")
    
    # Test health endpoint
    print("1. Testing health endpoint...")
    response = requests.get(f"{base_url}/health")
    assert response.status_code == 200
    health_data = response.json()
    print(f"   ✅ Health check: {health_data['status']}")
    print(f"   📊 Documents indexed: {health_data.get('documents_indexed', 0)}")
    
    # Test document ingestion
    print("2. Testing document ingestion...")
    test_documents = [
        {
            "content": "The Supreme Court ruled on the constitutional issue of due process in this landmark case.",
            "metadata": {"source": "test_case.pdf", "page": 1},
            "document_type": "source_document",
            "hierarchy_level": 0
        },
        {
            "content": "This chunk discusses the legal precedent established by the court's decision.",
            "metadata": {"source": "test_case.pdf", "page": 1, "chunk_index": 1},
            "document_type": "chunk",
            "parent_id": "test-parent-id",
            "hierarchy_level": 1
        },
        {
            "content": "Summary: The case established important precedent regarding constitutional rights and due process protections.",
            "metadata": {"summary_level": 2},
            "document_type": "summary",
            "parent_id": "test-chunk-id",
            "hierarchy_level": 2
        }
    ]
    
    response = requests.post(
        f"{base_url}/ingest",
        headers={"Content-Type": "application/json"},
        json=test_documents
    )
    assert response.status_code == 200
    ingest_data = response.json()
    print(f"   ✅ Ingested {ingest_data['documents_processed']} documents")
    
    # Wait for indexing to complete
    time.sleep(2)
    
    # Test search functionality
    print("3. Testing search functionality...")
    search_query = {
        "query": "constitutional rights due process",
        "top_k": 5,
        "use_hybrid": True,
        "include_hierarchy": False
    }
    
    response = requests.post(
        f"{base_url}/search",
        headers={"Content-Type": "application/json"},
        json=search_query
    )
    assert response.status_code == 200
    search_data = response.json()
    print(f"   ✅ Found {search_data['total_results']} results")
    print(f"   🔍 Search type: {search_data['search_type']}")
    
    if search_data['results']:
        best_result = search_data['results'][0]
        print(f"   📄 Best match score: {best_result['score']:.4f}")
        print(f"   📝 Content preview: {best_result['content'][:100]}...")
    
    # Test hierarchy functionality
    if search_data['results']:
        print("4. Testing hierarchy functionality...")
        document_id = search_data['results'][0]['metadata']['document_id']
        
        hierarchy_query = {
            "document_id": document_id,
            "include_parents": True,
            "include_children": True,
            "max_depth": 3
        }
        
        response = requests.post(
            f"{base_url}/hierarchy",
            headers={"Content-Type": "application/json"},
            json=hierarchy_query
        )
        assert response.status_code == 200
        hierarchy_data = response.json()
        print(f"   ✅ Retrieved hierarchy for document: {hierarchy_data['document_id']}")
        print(f"   👨‍👩‍👧‍👦 Context keys: {list(hierarchy_data['context'].keys())}")
    
    print("🎉 All tests passed! Integration is working correctly.")

if __name__ == "__main__":
    try:
        test_haystack_service()
    except AssertionError as e:
        print(f"❌ Test failed: {e}")
    except Exception as e:
        print(f"❌ Test error: {e}")