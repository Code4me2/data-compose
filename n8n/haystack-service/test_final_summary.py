#!/usr/bin/env python3
"""
Test script for the /get_final_summary endpoint
"""

import requests
import json
import sys

def test_get_final_summary(workflow_id):
    """Test the get_final_summary endpoint"""
    
    base_url = "http://localhost:8000"
    endpoint = f"{base_url}/get_final_summary/{workflow_id}"
    
    try:
        print(f"Testing GET {endpoint}")
        response = requests.get(endpoint)
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("\nSuccess! Final Summary Retrieved:")
            print(f"Workflow ID: {data['workflow_id']}")
            print(f"Status: {data['status']}")
            
            print("\nFinal Summary Document:")
            fs = data['final_summary']
            print(f"  Document ID: {fs['document_id']}")
            print(f"  Content Length: {fs['content_length']}")
            print(f"  Document Type: {fs['document_type']}")
            print(f"  Summary Type: {fs['summary_type']}")
            print(f"  Processing Status: {fs['processing_status']}")
            print(f"  Content Preview: {fs['content_preview'][:100]}...")
            
            print("\nTree Metadata:")
            tm = data['tree_metadata']
            print(f"  Total Documents: {tm['total_documents']}")
            print(f"  Max Depth: {tm['max_depth']}")
            print(f"  Document Types: {tm['document_types']}")
            print(f"  Level Distribution: {tm['level_distribution']}")
            print(f"  Summary Types: {tm['summary_types']}")
            
            print("\nNavigation Context:")
            nc = data['navigation_context']
            print(f"  Is Root: {nc['is_root']}")
            print(f"  Has Children: {nc['has_children']}")
            print(f"  Total Children: {nc['total_children']}")
            print(f"  Hierarchy Level: {nc['hierarchy_level']}")
            if nc['parent_id']:
                print(f"  Parent ID: {nc['parent_id']}")
            if nc['children_ids']:
                print(f"  Children IDs: {nc['children_ids'][:3]}..." if len(nc['children_ids']) > 3 else nc['children_ids'])
            
        elif response.status_code == 404:
            print(f"\nNot Found: {response.json()['detail']}")
        elif response.status_code == 409:
            print(f"\nConflict: {response.json()['detail']}")
        else:
            print(f"\nError: {response.json()}")
            
    except requests.exceptions.ConnectionError:
        print(f"Error: Could not connect to {base_url}")
        print("Make sure the Haystack service is running")
    except Exception as e:
        print(f"Error: {str(e)}")

def create_test_workflow():
    """Create a test workflow with documents for testing"""
    base_url = "http://localhost:8000"
    
    # Create a workflow ID
    import uuid
    workflow_id = str(uuid.uuid4())
    print(f"Creating test workflow: {workflow_id}")
    
    # Create some test documents
    test_docs = [
        {
            "content": "This is the first chunk of the original document.",
            "document_type": "source_document",
            "document_id": f"doc1_{workflow_id}",
            "workflow_id": workflow_id,
            "hierarchy_level": 0
        },
        {
            "content": "This is the second chunk of the original document.",
            "document_type": "source_document", 
            "document_id": f"doc2_{workflow_id}",
            "workflow_id": workflow_id,
            "hierarchy_level": 0
        },
        {
            "content": "Summary of chunks 1 and 2: The document discusses important topics.",
            "document_type": "summary",
            "document_id": f"summary1_{workflow_id}",
            "workflow_id": workflow_id,
            "hierarchy_level": 1,
            "summary_type": "chunk_summary"
        },
        {
            "content": "Final comprehensive summary: This document provides a complete overview of all the important topics discussed in the original chunks, synthesizing the key points into a coherent narrative.",
            "document_type": "summary",
            "document_id": f"final_{workflow_id}",
            "workflow_id": workflow_id,
            "hierarchy_level": 2,
            "summary_type": "final_summary",
            "is_final_summary": True
        }
    ]
    
    # Ingest documents
    try:
        response = requests.post(
            f"{base_url}/ingest",
            json={"documents": test_docs}
        )
        if response.status_code == 200:
            print(f"Test workflow created successfully!")
            return workflow_id
        else:
            print(f"Failed to create test workflow: {response.json()}")
            return None
    except Exception as e:
        print(f"Error creating test workflow: {str(e)}")
        return None

if __name__ == "__main__":
    if len(sys.argv) > 1:
        workflow_id = sys.argv[1]
    else:
        print("No workflow ID provided, creating test workflow...")
        workflow_id = create_test_workflow()
        if workflow_id:
            print(f"\nWaiting for Elasticsearch to index documents...")
            import time
            time.sleep(2)  # Give ES time to index
        else:
            sys.exit(1)
    
    if workflow_id:
        test_get_final_summary(workflow_id)