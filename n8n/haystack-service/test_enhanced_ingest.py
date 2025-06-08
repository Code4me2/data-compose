#!/usr/bin/env python3
"""
Test script for Enhanced Ingest Endpoint (Enhancement 1.2)
Tests workflow validation, tree metadata, and content statistics
"""

import requests
import json
import uuid
import sys

# Configuration
BASE_URL = "http://localhost:8000"
TEST_WORKFLOW_ID = f"test_workflow_{uuid.uuid4().hex[:8]}"

def test_enhanced_ingest():
    """Test the enhanced /ingest endpoint with comprehensive tree metadata"""
    
    print(f"Testing Enhanced Ingest Endpoint")
    print(f"Base URL: {BASE_URL}")
    print(f"Test Workflow ID: {TEST_WORKFLOW_ID}")
    print("-" * 60)
    
    # Test documents with hierarchical structure
    test_documents = [
        # Root document (final summary)
        {
            "content": "This is the final summary of all legal findings.\n\nIt covers multiple aspects of constitutional law and procedural requirements.",
            "metadata": {
                "source": "final_analysis.pdf",
                "author": "Legal AI System"
            },
            "document_type": "final_summary",
            "document_id": f"{TEST_WORKFLOW_ID}_final",
            "parent_id": None,
            "hierarchy_level": 0,
            "workflow_id": TEST_WORKFLOW_ID,
            "is_final_summary": True,
            "summary_type": "final_summary"
        },
        # Intermediate summaries
        {
            "content": "Summary of constitutional rights analysis including First Amendment protections.\n\nDetailed examination of precedent cases.",
            "metadata": {
                "source": "constitutional_section.pdf"
            },
            "document_type": "intermediate_summary",
            "document_id": f"{TEST_WORKFLOW_ID}_inter_1",
            "parent_id": f"{TEST_WORKFLOW_ID}_final",
            "hierarchy_level": 1,
            "workflow_id": TEST_WORKFLOW_ID,
            "is_final_summary": False,
            "summary_type": "intermediate_summary"
        },
        # Chunk summaries
        {
            "content": "Analysis of First Amendment free speech protections in the context of public forums.",
            "metadata": {
                "source": "chunk_1.txt"
            },
            "document_type": "chunk_summary",
            "document_id": f"{TEST_WORKFLOW_ID}_chunk_1",
            "parent_id": f"{TEST_WORKFLOW_ID}_inter_1",
            "hierarchy_level": 2,
            "workflow_id": TEST_WORKFLOW_ID,
            "is_final_summary": False,
            "summary_type": "chunk_summary"
        }
    ]
    
    # Test 1: Successful ingestion with enhanced metadata
    print("\n1. Testing successful ingestion with tree metadata...")
    response = requests.post(f"{BASE_URL}/ingest", json=test_documents)
    
    if response.status_code == 200:
        result = response.json()
        print(f"   ✅ Ingestion successful")
        print(f"   📊 Documents processed: {result['documents_processed']}")
        print(f"   📋 Document IDs: {result['document_ids']}")
        
        if 'workflow_summary' in result:
            print(f"   📈 Workflow Summary:")
            for wf_id, summary in result['workflow_summary'].items():
                print(f"      - {wf_id}: {summary['document_count']} docs, final_summary: {summary['has_final_summary']}")
        else:
            print(f"   ⚠️  No workflow_summary in response")
    else:
        print(f"   ❌ Ingestion failed: {response.status_code}")
        print(f"   Error: {response.text}")
        return False
    
    # Test 2: Verify content statistics are calculated
    print("\n2. Verifying content statistics...")
    # Get one of the ingested documents to check metadata
    search_response = requests.post(
        f"{BASE_URL}/search",
        json={
            "query": TEST_WORKFLOW_ID,
            "top_k": 1,
            "use_bm25": True,
            "use_vector": False
        }
    )
    
    if search_response.status_code == 200:
        search_results = search_response.json()
        if search_results['results']:
            doc = search_results['results'][0]
            metadata = doc.get('metadata', {})
            content_stats = metadata.get('content_stats', {})
            
            print(f"   📊 Content Statistics Found:")
            print(f"      - char_count: {content_stats.get('char_count', 'N/A')}")
            print(f"      - word_count: {content_stats.get('word_count', 'N/A')}")
            print(f"      - paragraph_count: {content_stats.get('paragraph_count', 'N/A')}")
            
            tree_metadata = metadata.get('tree_metadata', {})
            print(f"   🌳 Tree Metadata Found:")
            print(f"      - has_parent: {tree_metadata.get('has_parent', 'N/A')}")
            print(f"      - has_children: {tree_metadata.get('has_children', 'N/A')}")
            print(f"      - node_type: {tree_metadata.get('node_type', 'N/A')}")
        else:
            print(f"   ⚠️  No documents found in search")
    else:
        print(f"   ❌ Search failed: {search_response.status_code}")
    
    # Test 3: Workflow validation - duplicate final summary
    print("\n3. Testing workflow validation (duplicate final summary)...")
    duplicate_final = [{
        "content": "Another final summary",
        "document_type": "final_summary",
        "document_id": f"{TEST_WORKFLOW_ID}_final_dup",
        "parent_id": None,
        "hierarchy_level": 0,
        "workflow_id": TEST_WORKFLOW_ID,
        "is_final_summary": True,
        "summary_type": "final_summary"
    }]
    
    dup_response = requests.post(f"{BASE_URL}/ingest", json=duplicate_final)
    
    if dup_response.status_code == 400:
        print(f"   ✅ Correctly rejected duplicate final summary")
        print(f"   Error message: {dup_response.json().get('detail', 'N/A')}")
    else:
        print(f"   ❌ Expected 400 error, got {dup_response.status_code}")
    
    # Test 4: Check parent-child relationships
    print("\n4. Checking parent-child relationships...")
    hierarchy_response = requests.post(
        f"{BASE_URL}/hierarchy",
        json={
            "document_id": f"{TEST_WORKFLOW_ID}_inter_1",
            "include_parents": True,
            "include_children": True
        }
    )
    
    if hierarchy_response.status_code == 200:
        hierarchy = hierarchy_response.json()
        context = hierarchy.get('context', {})
        
        if 'parents' in context and context['parents']:
            print(f"   ✅ Parent relationship found: {len(context['parents'])} parent(s)")
        else:
            print(f"   ⚠️  No parents found")
            
        if 'children' in context and context['children']:
            print(f"   ✅ Child relationships found: {len(context['children'])} child(ren)")
        else:
            print(f"   ⚠️  No children found")
    else:
        print(f"   ❌ Hierarchy request failed: {hierarchy_response.status_code}")
    
    print("\n" + "=" * 60)
    print("Enhanced Ingest Testing Complete!")
    return True

if __name__ == "__main__":
    # Check if service is running
    try:
        health_response = requests.get(f"{BASE_URL}/health")
        if health_response.status_code != 200:
            print(f"❌ Service not healthy at {BASE_URL}")
            sys.exit(1)
    except requests.exceptions.ConnectionError:
        print(f"❌ Cannot connect to service at {BASE_URL}")
        print("Make sure the Haystack service is running:")
        print("  cd haystack-service && python haystack_service_simple.py")
        sys.exit(1)
    
    # Run tests
    success = test_enhanced_ingest()
    sys.exit(0 if success else 1)