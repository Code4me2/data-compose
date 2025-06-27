-- Query to get hierarchy data for visualization
-- Use this in your PostgreSQL node in n8n

WITH batch_data AS (
    SELECT 
        id,
        content,
        summary,
        hierarchy_level,
        parent_id,
        child_ids,
        metadata,
        COALESCE(metadata->>'source', metadata->>'sources', 'document_' || id) as source_name
    FROM hierarchical_documents
    WHERE batch_id = $1
    ORDER BY hierarchy_level, id
),
level_counts AS (
    SELECT 
        hierarchy_level,
        COUNT(*) as doc_count,
        CASE 
            WHEN hierarchy_level = 0 THEN 'Source Documents'
            WHEN hierarchy_level = 1 THEN 'Initial Summaries'
            WHEN hierarchy_level = 2 THEN 'Combined Summaries'
            ELSE 'Level ' || hierarchy_level
        END as label
    FROM batch_data
    GROUP BY hierarchy_level
)
SELECT json_build_object(
    'batchId', $1,
    'levels', (
        SELECT json_agg(
            json_build_object(
                'level', hierarchy_level,
                'count', doc_count,
                'label', label
            ) ORDER BY hierarchy_level
        )
        FROM level_counts
    ),
    'documents', (
        SELECT json_object_agg(
            hierarchy_level::text,
            level_docs
        )
        FROM (
            SELECT 
                hierarchy_level,
                json_agg(
                    json_build_object(
                        'id', id,
                        'content', content,
                        'summary', summary,
                        'source', source_name,
                        'parent_id', parent_id,
                        'child_ids', child_ids
                    ) ORDER BY id
                ) as level_docs
            FROM batch_data
            GROUP BY hierarchy_level
        ) as grouped_docs
    )
) as hierarchy;