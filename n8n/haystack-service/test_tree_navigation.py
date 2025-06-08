import asyncio
import httpx
import json
import time
from datetime import datetime
from typing import List, Dict, Any


class TreeNavigationTestSuite:
    """Comprehensive test suite for tree navigation functionality"""
    
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.test_workflow_id = f"test_workflow_{int(time.time())}"
        self.created_document_ids = []
    
    async def run_all_tests(self):
        """Execute complete test suite with detailed reporting"""
        
        print("🧪 Starting Tree Navigation Test Suite")
        print(f"Base URL: {self.base_url}")
        print(f"Test Workflow ID: {self.test_workflow_id}")
        print("-" * 60)
        
        try:
            # PHASE 1: Setup test data
            await self.test_data_setup()
            
            # PHASE 2: Test tree navigation endpoints
            await self.test_final_summary_discovery()
            await self.test_complete_tree_retrieval()
            await self.test_document_with_context()
            
            # PHASE 3: Test error conditions
            await self.test_error_handling()
            
            # PHASE 4: Performance validation
            await self.test_performance_characteristics()
            
            print("\n🎉 All tree navigation tests passed!")
            
        except Exception as e:
            print(f"\n❌ Test suite failed: {e}")
            raise
        finally:
            # Cleanup test data
            await self.cleanup_test_data()
    
    async def test_data_setup(self):
        """Create hierarchical test data for tree navigation"""
        
        print("\n📋 Phase 1: Setting up test data...")
        
        # Create test documents in hierarchical structure
        test_documents = [
            # Level 0: Final Summary (Root)
            {
                "content": "This is the final summary of the complete legal analysis covering all constitutional issues and precedents.",
                "metadata": {
                    "source": "final_analysis.pdf"
                },
                "document_type": "final_summary",
                "document_id": f"{self.test_workflow_id}_final",
                "parent_id": None,
                "hierarchy_level": 0,
                "workflow_id": self.test_workflow_id,
                "is_final_summary": True,
                "summary_type": "final_summary"
            },
            
            # Level 1: Intermediate Summaries
            {
                "content": "Intermediate summary covering constitutional rights and due process analysis from multiple case precedents.",
                "metadata": {
                    "source": "constitutional_section.pdf"
                },
                "document_type": "intermediate_summary",
                "document_id": f"{self.test_workflow_id}_inter_1",
                "parent_id": f"{self.test_workflow_id}_final",
                "hierarchy_level": 1,
                "workflow_id": self.test_workflow_id,
                "is_final_summary": False,
                "summary_type": "intermediate_summary"
            },
            {
                "content": "Intermediate summary covering procedural aspects and court jurisdiction analysis.",
                "metadata": {
                    "source": "procedural_section.pdf"
                },
                "document_type": "intermediate_summary", 
                "document_id": f"{self.test_workflow_id}_inter_2",
                "parent_id": f"{self.test_workflow_id}_final",
                "hierarchy_level": 1,
                "workflow_id": self.test_workflow_id,
                "is_final_summary": False,
                "summary_type": "intermediate_summary"
            },
            
            # Level 2: Detailed Chunks
            {
                "content": "Detailed analysis of the First Amendment implications and free speech protections in this case context.",
                "metadata": {
                    "source": "chunk_1.txt"
                },
                "document_type": "chunk",
                "document_id": f"{self.test_workflow_id}_chunk_1",
                "parent_id": f"{self.test_workflow_id}_inter_1",
                "hierarchy_level": 2,
                "workflow_id": self.test_workflow_id,
                "is_final_summary": False,
                "summary_type": "chunk_summary"
            },
            {
                "content": "Detailed analysis of due process requirements and constitutional standards for procedural fairness.",
                "metadata": {
                    "source": "chunk_2.txt"
                },
                "document_type": "chunk",
                "document_id": f"{self.test_workflow_id}_chunk_2", 
                "parent_id": f"{self.test_workflow_id}_inter_1",
                "hierarchy_level": 2,
                "workflow_id": self.test_workflow_id,
                "is_final_summary": False,
                "summary_type": "chunk_summary"
            },
            {
                "content": "Detailed analysis of jurisdictional requirements and venue considerations for federal court proceedings.",
                "metadata": {
                    "source": "chunk_3.txt"
                },
                "document_type": "chunk",
                "document_id": f"{self.test_workflow_id}_chunk_3",
                "parent_id": f"{self.test_workflow_id}_inter_2", 
                "hierarchy_level": 2,
                "workflow_id": self.test_workflow_id,
                "is_final_summary": False,
                "summary_type": "chunk_summary"
            }
        ]
        
        # Ingest test documents
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/ingest",
                json=test_documents
            )
            
            if response.status_code != 200:
                raise Exception(f"Failed to ingest test documents: {response.status_code} - {response.text}")
            
            ingest_result = response.json()
            self.created_document_ids = ingest_result["document_ids"]
            
            print(f"   ✅ Created {len(self.created_document_ids)} test documents")
            print(f"   ✅ Workflow summary: {ingest_result.get('workflow_summary', {})}")
            
            # Wait for indexing to complete
            await asyncio.sleep(2)
    
    async def test_final_summary_discovery(self):
        """Test final summary discovery endpoint"""
        
        print("\n📋 Phase 2a: Testing final summary discovery...")
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/get_final_summary/{self.test_workflow_id}"
            )
            
            if response.status_code != 200:
                raise Exception(f"Final summary discovery failed: {response.status_code} - {response.text}")
            
            final_summary = response.json()
            
            # VALIDATION: Check response structure
            required_fields = ["workflow_id", "final_summary", "tree_metadata", "navigation_context", "status"]
            for field in required_fields:
                if field not in final_summary:
                    raise Exception(f"Missing required field in final summary response: {field}")
            
            # VALIDATION: Check data accuracy
            if final_summary["workflow_id"] != self.test_workflow_id:
                raise Exception(f"Workflow ID mismatch: expected {self.test_workflow_id}, got {final_summary['workflow_id']}")
            
            if final_summary["final_summary"]["document_id"] != f"{self.test_workflow_id}_final":
                raise Exception(f"Document ID mismatch: expected {self.test_workflow_id}_final")
            
            # VALIDATION: Check tree metadata
            tree_metadata = final_summary["tree_metadata"]
            if tree_metadata["total_documents"] != 6:  # 1 final + 2 intermediate + 3 chunks
                raise Exception(f"Incorrect document count: expected 6, got {tree_metadata['total_documents']}")
            
            # Check level distribution
            level_distribution = tree_metadata.get("level_distribution", {})
            if level_distribution.get(0) != 1:  # 1 document at level 0
                raise Exception(f"Expected 1 document at level 0, got {level_distribution.get(0)}")
            
            # VALIDATION: Check navigation context
            nav_context = final_summary["navigation_context"]
            if not nav_context["is_root"]:
                raise Exception("Final summary should be marked as root")
            
            if not nav_context["has_children"]:
                raise Exception("Final summary should have children")
            
            if len(nav_context["children_ids"]) != 2:  # 2 intermediate summaries
                raise Exception(f"Expected 2 children, got {len(nav_context['children_ids'])}")
            
            print(f"   ✅ Final summary discovery working correctly")
            print(f"   📊 Tree contains {tree_metadata['total_documents']} documents")
            print(f"   📊 Level distribution: {level_distribution}")
    
    async def test_complete_tree_retrieval(self):
        """Test complete tree structure retrieval"""
        
        print("\n📋 Phase 2b: Testing complete tree retrieval...")
        
        async with httpx.AsyncClient() as client:
            # Test with different options
            test_cases = [
                {"max_depth": 10, "include_content": False},
                {"max_depth": 1, "include_content": True}
            ]
            
            for case in test_cases:
                params = {
                    "max_depth": case["max_depth"],
                    "include_content": str(case["include_content"]).lower()
                }
                
                response = await client.get(
                    f"{self.base_url}/get_complete_tree/{self.test_workflow_id}",
                    params=params
                )
                
                if response.status_code != 200:
                    raise Exception(f"Complete tree retrieval failed: {response.status_code} - {response.text}")
                
                tree_response = response.json()
                
                # VALIDATION: Check response structure
                required_fields = ["workflow_id", "tree", "tree_metadata", "query_metadata", "status"]
                for field in required_fields:
                    if field not in tree_response:
                        raise Exception(f"Missing field in tree response: {field}")
                
                # VALIDATION: Check tree structure
                tree_nodes = tree_response["tree"]
                if len(tree_nodes) != 1:
                    raise Exception("Should have exactly one root node")
                
                tree_root = tree_nodes[0]
                if tree_root["document_id"] != f"{self.test_workflow_id}_final":
                    raise Exception("Tree root should be final summary")
                
                if tree_root["hierarchy_level"] != 0:
                    raise Exception("Root should be at hierarchy level 0")
                
                # VALIDATION: Check tree depth limiting
                if case["max_depth"] == 1:
                    # Should only have root and immediate children
                    if tree_root.get("children") and len(tree_root["children"]) > 0:
                        # Check that children don't have their own children
                        for child in tree_root["children"]:
                            if child.get("children") and len(child["children"]) > 0:
                                raise Exception("Depth limiting not working correctly - found grandchildren")
                else:
                    # Should have complete tree
                    if len(tree_root.get("children", [])) != 2:
                        raise Exception(f"Expected 2 children at root, got {len(tree_root.get('children', []))}")
                
                # VALIDATION: Check content inclusion
                if case["include_content"]:
                    if "content" not in tree_root or tree_root["content"] is None:
                        raise Exception("Full content should be included when requested")
                else:
                    if tree_root.get("content") is not None:
                        raise Exception("Content should not be included when not requested")
                
                print(f"   ✅ Tree retrieval with max_depth={case['max_depth']}, include_content={case['include_content']} working correctly")
    
    async def test_document_with_context(self):
        """Test document context retrieval"""
        
        print("\n📋 Phase 2c: Testing document context retrieval...")
        
        # Test with intermediate document (has both parent and children)
        test_doc_id = f"{self.test_workflow_id}_inter_1"
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/get_document_with_context/{test_doc_id}",
                params={"include_full_content": "true", "include_siblings": "true"}
            )
            
            if response.status_code != 200:
                raise Exception(f"Document context retrieval failed: {response.status_code} - {response.text}")
            
            context_response = response.json()
            
            # VALIDATION: Check response structure
            required_fields = ["document_id", "content", "content_preview", "document_type", 
                              "breadcrumb_path", "navigation_helpers", "siblings"]
            for field in required_fields:
                if field not in context_response:
                    raise Exception(f"Missing field in context response: {field}")
            
            # VALIDATION: Check navigation helpers
            nav_helpers = context_response["navigation_helpers"]
            
            if not nav_helpers["has_parent"]:
                raise Exception("Intermediate document should have parent")
            
            if not nav_helpers["has_children"]:
                raise Exception("Intermediate document should have children")
            
            if nav_helpers["parent_id"] != f"{self.test_workflow_id}_final":
                raise Exception("Parent should be final summary")
            
            if len(nav_helpers["children_ids"]) != 2:  # 2 chunks
                raise Exception(f"Expected 2 children, got {len(nav_helpers['children_ids'])}")
            
            # VALIDATION: Check breadcrumb path
            breadcrumbs = context_response["breadcrumb_path"]
            if len(breadcrumbs) != 2:  # Root -> current
                raise Exception(f"Expected 2 breadcrumb items, got {len(breadcrumbs)}")
            
            if breadcrumbs[0]["document_id"] != f"{self.test_workflow_id}_final":
                raise Exception("First breadcrumb should be root")
            
            if breadcrumbs[1]["document_id"] != test_doc_id:
                raise Exception("Last breadcrumb should be current document")
            
            # VALIDATION: Check siblings
            siblings = context_response["siblings"]
            if len(siblings) != 1:  # 1 sibling (the other intermediate)
                raise Exception(f"Expected 1 sibling, got {len(siblings)}")
            
            print(f"   ✅ Document context retrieval working correctly")
            print(f"   🔗 Navigation context includes {len(breadcrumbs)} breadcrumb levels and {len(siblings)} siblings")
    
    async def test_error_handling(self):
        """Test error conditions and edge cases"""
        
        print("\n📋 Phase 3: Testing error handling...")
        
        async with httpx.AsyncClient() as client:
            # Test non-existent workflow
            response = await client.get(f"{self.base_url}/get_final_summary/nonexistent-workflow")
            if response.status_code != 404:
                raise Exception(f"Should return 404 for non-existent workflow, got {response.status_code}")
            
            # Test non-existent document
            response = await client.get(f"{self.base_url}/get_document_with_context/nonexistent-doc")
            if response.status_code != 404:
                raise Exception(f"Should return 404 for non-existent document, got {response.status_code}")
            
            # Test invalid max_depth
            response = await client.get(
                f"{self.base_url}/get_complete_tree/{self.test_workflow_id}",
                params={"max_depth": "25"}  # Above limit
            )
            if response.status_code != 422:
                raise Exception(f"Should return 422 for invalid max_depth, got {response.status_code}")
            
            print(f"   ✅ Error handling working correctly")
    
    async def test_performance_characteristics(self):
        """Test performance and response times"""
        
        print("\n📋 Phase 4: Testing performance characteristics...")
        
        async with httpx.AsyncClient() as client:
            
            # Test final summary discovery performance
            start_time = time.time()
            response = await client.get(f"{self.base_url}/get_final_summary/{self.test_workflow_id}")
            final_summary_time = time.time() - start_time
            
            if response.status_code != 200:
                raise Exception("Performance test failed - final summary not accessible")
            
            if final_summary_time > 2.0:  # Should be fast
                print(f"   ⚠️  Final summary discovery took {final_summary_time:.2f}s (>2s threshold)")
            
            # Test complete tree retrieval performance
            start_time = time.time()
            response = await client.get(f"{self.base_url}/get_complete_tree/{self.test_workflow_id}")
            tree_retrieval_time = time.time() - start_time
            
            if response.status_code != 200:
                raise Exception("Performance test failed - tree retrieval not accessible")
            
            if tree_retrieval_time > 5.0:  # Should be reasonable for small trees
                print(f"   ⚠️  Tree retrieval took {tree_retrieval_time:.2f}s (>5s threshold)")
            
            # Test document context performance
            start_time = time.time()
            response = await client.get(
                f"{self.base_url}/get_document_with_context/{self.test_workflow_id}_inter_1"
            )
            context_time = time.time() - start_time
            
            print(f"   ✅ Performance acceptable:")
            print(f"      • Final summary: {final_summary_time:.3f}s")
            print(f"      • Tree retrieval: {tree_retrieval_time:.3f}s")
            print(f"      • Document context: {context_time:.3f}s")
    
    async def cleanup_test_data(self):
        """Clean up test documents"""
        
        print("\n🧹 Cleaning up test data...")
        print(f"   📋 Test workflow {self.test_workflow_id} with {len(self.created_document_ids)} documents created")
        print(f"   💾 Test data remains in Elasticsearch for manual inspection if needed")


# STANDALONE TEST EXECUTION
async def main():
    """Main test execution function"""
    
    test_suite = TreeNavigationTestSuite()
    await test_suite.run_all_tests()


if __name__ == "__main__":
    asyncio.run(main())