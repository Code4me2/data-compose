#!/bin/bash
# Script to check hierarchy structure in database

if [ $# -eq 0 ]; then
    echo "Usage: ./check-hierarchy.sh [batch-id]"
    echo "Example: ./check-hierarchy.sh dca97b06-ca5b-4ebb-9eae-62f62c100951"
    exit 1
fi

BATCH_ID="$1"

echo "Checking hierarchy for batch: $BATCH_ID"
echo "========================================="

# Count documents at each level
echo -e "\nDocuments per level:"
docker exec data-compose-db-1 psql -U your_db_user -d your_db_name -c "
SELECT hierarchy_level, COUNT(*) as document_count 
FROM hierarchical_documents 
WHERE batch_id = '$BATCH_ID' 
GROUP BY hierarchy_level 
ORDER BY hierarchy_level;"

# Show document relationships
echo -e "\nDocument hierarchy tree:"
docker exec data-compose-db-1 psql -U your_db_user -d your_db_name -c "
SELECT 
    id,
    hierarchy_level as lvl,
    CASE 
        WHEN content != '' THEN 'source'
        ELSE 'summary'
    END as type,
    parent_id,
    array_length(child_ids, 1) as num_children,
    LEFT(COALESCE(summary, content), 50) as preview
FROM hierarchical_documents 
WHERE batch_id = '$BATCH_ID' 
ORDER BY hierarchy_level, id;"

# Show parent-child relationships
echo -e "\nParent-child relationships:"
docker exec data-compose-db-1 psql -U your_db_user -d your_db_name -c "
SELECT 
    p.id as parent_id, 
    p.hierarchy_level as parent_lvl,
    array_to_string(p.child_ids, ',') as children
FROM hierarchical_documents p
WHERE p.batch_id = '$BATCH_ID' 
  AND p.child_ids IS NOT NULL 
  AND array_length(p.child_ids, 1) > 0
ORDER BY p.hierarchy_level, p.id;"