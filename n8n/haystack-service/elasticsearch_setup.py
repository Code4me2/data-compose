import requests
import json
import time

def wait_for_elasticsearch(host="http://localhost:9200", max_retries=30):
    """Wait for Elasticsearch to be ready"""
    for i in range(max_retries):
        try:
            response = requests.get(f"{host}/_cluster/health")
            if response.status_code == 200:
                print("✅ Elasticsearch is ready")
                return True
        except requests.exceptions.ConnectionError:
            pass
        
        print(f"⏳ Waiting for Elasticsearch... ({i+1}/{max_retries})")
        time.sleep(2)
    
    raise Exception("❌ Elasticsearch is not responding")

def create_index(host="http://localhost:9200"):
    """Create the judicial documents index with proper mapping"""
    
    index_mapping = {
        "settings": {
            "number_of_shards": 1,
            "number_of_replicas": 0,
            "index": {
                "refresh_interval": "1s"
            },
            "analysis": {
                "analyzer": {
                    "legal_analyzer": {
                        "type": "standard",
                        "stopwords": "_english_"
                    }
                }
            }
        },
        "mappings": {
            "properties": {
                "content": {
                    "type": "text",
                    "analyzer": "legal_analyzer",
                    "fields": {
                        "keyword": {
                            "type": "keyword",
                            "ignore_above": 256
                        }
                    }
                },
                "embedding": {
                    "type": "dense_vector",
                    "dims": 384,
                    "index": True,
                    "similarity": "cosine",
                    "index_options": {
                        "type": "hnsw",
                        "m": 16,
                        "ef_construction": 200
                    }
                },
                "document_type": {
                    "type": "keyword"
                },
                "document_id": {
                    "type": "keyword"
                },
                "hierarchy": {
                    "type": "object",
                    "properties": {
                        "level": {"type": "integer"},
                        "parent_id": {"type": "keyword"},
                        "children_ids": {"type": "keyword"},
                        "path": {"type": "keyword"}
                    }
                },
                "metadata": {
                    "type": "object",
                    "dynamic": True,
                    "properties": {
                        "source": {"type": "keyword"},
                        "timestamp": {"type": "date"},
                        "file_path": {"type": "keyword"},
                        "page_number": {"type": "integer"},
                        "chunk_index": {"type": "integer"}
                    }
                },
                "ingestion_timestamp": {
                    "type": "date"
                }
            }
        }
    }
    
    # Delete existing index if it exists
    try:
        response = requests.delete(f"{host}/judicial-documents")
        if response.status_code == 200:
            print("🗑️  Deleted existing index")
    except:
        pass
    
    # Create new index
    response = requests.put(
        f"{host}/judicial-documents",
        headers={"Content-Type": "application/json"},
        data=json.dumps(index_mapping)
    )
    
    if response.status_code == 200:
        print("✅ Created judicial-documents index")
        print(f"📋 Index details: {response.json()}")
    else:
        print(f"❌ Failed to create index: {response.status_code} - {response.text}")
        raise Exception("Index creation failed")

if __name__ == "__main__":
    print("🚀 Setting up Elasticsearch for Judicial Access...")
    wait_for_elasticsearch()
    create_index()
    print("✅ Elasticsearch setup complete!")