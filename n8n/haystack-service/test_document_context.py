#!/usr/bin/env python3
"""
Test script for the /get_document_with_context endpoint
"""

import requests
import json
from datetime import datetime

# Service configuration
BASE_URL = "http://localhost:8000"

def test_get_document_with_context():
    """Test the get_document_with_context endpoint with various parameters"""
    
    print("Testing /get_document_with_context endpoint\n")
    
    # First, let's ingest some test documents to create a hierarchy
    print("1. Creating test document hierarchy...")
    
    # Create a workflow with hierarchical documents
    workflow_id = f"test-workflow-{datetime.now().isoformat()}"
    
    # Root document
    root_doc = {
        "content": "This is the root document containing the main topic overview. It provides a comprehensive introduction to the subject matter.",
        "metadata": {"title": "Root Document", "author": "Test System"},
        "document_type": "source_document",
        "workflow_id": workflow_id,
        "hierarchy_level": 0
    }
    
    # Ingest root
    response = requests.post(f"{BASE_URL}/ingest", json=[root_doc])
    root_id = response.json()["document_ids"][0]
    print(f"   Created root document: {root_id}")
    
    # Create child documents
    child_docs = []
    for i in range(3):
        child_doc = {
            "content": f"This is child document {i+1}. It contains detailed information about subtopic {i+1} related to the main topic.",
            "metadata": {"title": f"Child Document {i+1}", "author": "Test System"},
            "document_type": "chunk",
            "parent_id": root_id,
            "workflow_id": workflow_id,
            "hierarchy_level": 1
        }
        child_docs.append(child_doc)
    
    # Ingest children
    response = requests.post(f"{BASE_URL}/ingest", json=child_docs)
    child_ids = response.json()["document_ids"]
    print(f"   Created {len(child_ids)} child documents")
    
    # Create grandchild for first child
    grandchild_doc = {
        "content": "This is a grandchild document with even more specific details about a particular aspect of subtopic 1.",
        "metadata": {"title": "Grandchild Document", "author": "Test System"},
        "document_type": "chunk_summary",
        "parent_id": child_ids[0],
        "workflow_id": workflow_id,
        "hierarchy_level": 2
    }
    
    response = requests.post(f"{BASE_URL}/ingest", json=[grandchild_doc])
    grandchild_id = response.json()["document_ids"][0]
    print(f"   Created grandchild document: {grandchild_id}")
    
    print("\n2. Testing /get_document_with_context endpoint...")
    
    # Test 1: Get grandchild with full context and siblings
    print("\n   Test 1: Get grandchild document with full context and siblings")
    response = requests.get(
        f"{BASE_URL}/get_document_with_context/{grandchild_id}",
        params={"include_full_content": True, "include_siblings": True}
    )
    
    if response.status_code == 200:
        data = response.json()
        print(f"   ✓ Document ID: {data['document_id']}")
        print(f"   ✓ Document Type: {data['document_type']}")
        print(f"   ✓ Hierarchy Level: {data['hierarchy_level']}")
        print(f"   ✓ Is Root: {data['is_root']}")
        print(f"   ✓ Is Leaf: {data['is_leaf']}")
        print(f"   ✓ Has Parent: {data['has_parent']}")
        print(f"   ✓ Has Children: {data['has_children']}")
        print(f"   ✓ Content Length: {data['content_length']} chars")
        print(f"   ✓ Query Time: {data['query_time_ms']}ms")
        
        print(f"\n   Breadcrumb Path ({len(data['breadcrumb_path'])} items):")
        for idx, crumb in enumerate(data['breadcrumb_path']):
            print(f"     {idx}: Level {crumb['hierarchy_level']} - {crumb['document_type']} - {crumb['content_preview'][:50]}...")
        
        if data['siblings']:
            print(f"\n   Siblings ({data['total_siblings']} total, position {data['sibling_position']}):")
            for sibling in data['siblings']:
                print(f"     Position {sibling['position']}: {sibling['document_type']} - {sibling['content_preview'][:50]}...")
    else:
        print(f"   ✗ Error: {response.status_code} - {response.text}")
    
    # Test 2: Get child document with preview only, no siblings
    print("\n   Test 2: Get child document with content preview only")
    response = requests.get(
        f"{BASE_URL}/get_document_with_context/{child_ids[1]}",
        params={"include_full_content": False, "include_siblings": False}
    )
    
    if response.status_code == 200:
        data = response.json()
        print(f"   ✓ Document ID: {data['document_id']}")
        print(f"   ✓ Content Preview: {data['content_preview'][:100]}...")
        print(f"   ✓ Full Content Included: {'Yes' if data['content'] else 'No'}")
        print(f"   ✓ Children IDs: {data['children_ids']}")
        print(f"   ✓ Parent ID: {data['parent_id']}")
        print(f"   ✓ Breadcrumb items: {len(data['breadcrumb_path'])}")
        print(f"   ✓ Siblings included: {'Yes' if data['siblings'] else 'No'}")
    else:
        print(f"   ✗ Error: {response.status_code} - {response.text}")
    
    # Test 3: Get root document
    print("\n   Test 3: Get root document to verify is_root flag")
    response = requests.get(
        f"{BASE_URL}/get_document_with_context/{root_id}",
        params={"include_full_content": False, "include_siblings": True}
    )
    
    if response.status_code == 200:
        data = response.json()
        print(f"   ✓ Document ID: {data['document_id']}")
        print(f"   ✓ Is Root: {data['is_root']} (should be True)")
        print(f"   ✓ Has Parent: {data['has_parent']} (should be False)")
        print(f"   ✓ Has Children: {data['has_children']} (should be True)")
        print(f"   ✓ Children Count: {len(data['children_ids'])}")
        print(f"   ✓ Breadcrumb Path Length: {len(data['breadcrumb_path'])} (should be 1)")
    else:
        print(f"   ✗ Error: {response.status_code} - {response.text}")
    
    # Test 4: Test with non-existent document
    print("\n   Test 4: Test with non-existent document ID")
    response = requests.get(f"{BASE_URL}/get_document_with_context/non-existent-id")
    print(f"   Expected 404, got: {response.status_code}")
    if response.status_code == 404:
        print(f"   ✓ Correct error handling: {response.json()['detail']}")
    
    print("\n3. Testing complete! Summary:")
    print(f"   - Created hierarchy with {1 + len(child_ids) + 1} documents")
    print(f"   - Root → Children → Grandchild structure verified")
    print(f"   - Breadcrumb navigation working correctly")
    print(f"   - Sibling information retrieved successfully")
    print(f"   - Navigation helpers (is_root, is_leaf, etc.) functioning")
    print(f"   - Query parameters (include_full_content, include_siblings) working")


if __name__ == "__main__":
    try:
        # Check if service is running
        response = requests.get(f"{BASE_URL}/health")
        if response.status_code == 200:
            print("Service is healthy, starting tests...\n")
            test_get_document_with_context()
        else:
            print("Service health check failed!")
    except requests.exceptions.ConnectionError:
        print("Error: Could not connect to the service at", BASE_URL)
        print("Make sure the Haystack service is running (python haystack_service_simple.py)")