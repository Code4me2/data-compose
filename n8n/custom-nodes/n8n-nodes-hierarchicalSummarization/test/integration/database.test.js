const assert = require('assert');
const { Pool } = require('pg');

describe('Database Integration Tests', () => {
  let pool;
  const testBatchId = 'test-' + Date.now();
  
  // Database configuration for testing
  const dbConfig = {
    host: process.env.TEST_DB_HOST || 'localhost',
    port: process.env.TEST_DB_PORT || 5432,
    database: process.env.TEST_DB_NAME || 'postgres',
    user: process.env.TEST_DB_USER || 'postgres',
    password: process.env.TEST_DB_PASSWORD || 'postgres',
  };

  before(async () => {
    // Create pool connection
    pool = new Pool(dbConfig);
    
    // Ensure test tables exist
    await ensureDatabaseSchema(pool);
  });

  after(async () => {
    // Clean up test data
    if (pool) {
      await pool.query('DELETE FROM hierarchical_documents WHERE batch_id LIKE $1', ['test-%']);
      await pool.query('DELETE FROM processing_status WHERE batch_id LIKE $1', ['test-%']);
      await pool.end();
    }
  });

  async function ensureDatabaseSchema(pool) {
    const schemaSQL = `
      -- Main documents table with hierarchy tracking
      CREATE TABLE IF NOT EXISTS hierarchical_documents (
        id SERIAL PRIMARY KEY,
        content TEXT NOT NULL,
        summary TEXT,
        batch_id VARCHAR(255) NOT NULL,
        hierarchy_level INTEGER NOT NULL,
        parent_id INTEGER REFERENCES hierarchical_documents(id) ON DELETE CASCADE,
        child_ids INTEGER[] DEFAULT '{}',
        metadata JSONB DEFAULT '{}',
        token_count INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      -- Indexes for performance
      CREATE INDEX IF NOT EXISTS idx_batch_level 
        ON hierarchical_documents(batch_id, hierarchy_level);
      CREATE INDEX IF NOT EXISTS idx_parent 
        ON hierarchical_documents(parent_id);
      
      -- Processing status tracking
      CREATE TABLE IF NOT EXISTS processing_status (
        id SERIAL PRIMARY KEY,
        batch_id VARCHAR(255) UNIQUE NOT NULL,
        current_level INTEGER NOT NULL DEFAULT 0,
        total_documents INTEGER,
        processed_documents INTEGER DEFAULT 0,
        status VARCHAR(50) NOT NULL DEFAULT 'processing',
        error_message TEXT,
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP
      );
    `;
    
    await pool.query(schemaSQL);
  }

  describe('Database Schema', () => {
    it('should have hierarchical_documents table', async () => {
      const result = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'hierarchical_documents'
        );
      `);
      assert.strictEqual(result.rows[0].exists, true);
    });

    it('should have processing_status table', async () => {
      const result = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'processing_status'
        );
      `);
      assert.strictEqual(result.rows[0].exists, true);
    });
  });

  describe('Document Operations', () => {
    it('should insert a document', async () => {
      const result = await pool.query(
        `INSERT INTO hierarchical_documents 
         (content, batch_id, hierarchy_level, token_count, metadata) 
         VALUES ($1, $2, $3, $4, $5) 
         RETURNING id`,
        ['Test content', testBatchId, 0, 10, JSON.stringify({ test: true })]
      );
      
      assert(result.rows[0].id > 0, 'Should return valid ID');
    });

    it('should retrieve documents by batch and level', async () => {
      // Insert test documents
      await pool.query(
        `INSERT INTO hierarchical_documents 
         (content, batch_id, hierarchy_level, token_count) 
         VALUES ($1, $2, $3, $4)`,
        ['Level 0 doc 1', testBatchId, 0, 10]
      );
      await pool.query(
        `INSERT INTO hierarchical_documents 
         (content, batch_id, hierarchy_level, token_count) 
         VALUES ($1, $2, $3, $4)`,
        ['Level 0 doc 2', testBatchId, 0, 10]
      );
      
      const result = await pool.query(
        `SELECT * FROM hierarchical_documents 
         WHERE batch_id = $1 AND hierarchy_level = $2 
         ORDER BY id`,
        [testBatchId, 0]
      );
      
      assert.strictEqual(result.rows.length, 3, 'Should find 3 documents at level 0'); // Including the one from previous test
    });

    it('should update parent-child relationships', async () => {
      // Create parent document
      const parentResult = await pool.query(
        `INSERT INTO hierarchical_documents 
         (content, batch_id, hierarchy_level, token_count) 
         VALUES ($1, $2, $3, $4) 
         RETURNING id`,
        ['Parent doc', testBatchId, 0, 10]
      );
      const parentId = parentResult.rows[0].id;
      
      // Create child document
      const childResult = await pool.query(
        `INSERT INTO hierarchical_documents 
         (content, summary, batch_id, hierarchy_level, parent_id, token_count) 
         VALUES ($1, $2, $3, $4, $5, $6) 
         RETURNING id`,
        ['', 'Child summary', testBatchId, 1, parentId, 5]
      );
      const childId = childResult.rows[0].id;
      
      // Update parent's child_ids
      await pool.query(
        `UPDATE hierarchical_documents 
         SET child_ids = array_append(child_ids, $1) 
         WHERE id = $2`,
        [childId, parentId]
      );
      
      // Verify relationship
      const parent = await pool.query(
        'SELECT child_ids FROM hierarchical_documents WHERE id = $1',
        [parentId]
      );
      
      assert(Array.isArray(parent.rows[0].child_ids), 'child_ids should be an array');
      assert(parent.rows[0].child_ids.includes(childId), 'Parent should contain child ID');
    });
  });

  describe('Processing Status', () => {
    const statusBatchId = 'test-status-' + Date.now();
    
    it('should create processing status', async () => {
      await pool.query(
        `INSERT INTO processing_status (batch_id, total_documents, status) 
         VALUES ($1, $2, 'processing')`,
        [statusBatchId, 5]
      );
      
      const result = await pool.query(
        'SELECT * FROM processing_status WHERE batch_id = $1',
        [statusBatchId]
      );
      
      assert.strictEqual(result.rows[0].total_documents, 5);
      assert.strictEqual(result.rows[0].status, 'processing');
    });

    it('should update processing progress', async () => {
      await pool.query(
        `UPDATE processing_status 
         SET current_level = $1, processed_documents = processed_documents + $2 
         WHERE batch_id = $3`,
        [1, 3, statusBatchId]
      );
      
      const result = await pool.query(
        'SELECT * FROM processing_status WHERE batch_id = $1',
        [statusBatchId]
      );
      
      assert.strictEqual(result.rows[0].current_level, 1);
      assert.strictEqual(result.rows[0].processed_documents, 3);
    });

    it('should mark processing as completed', async () => {
      await pool.query(
        `UPDATE processing_status 
         SET status = 'completed', completed_at = CURRENT_TIMESTAMP 
         WHERE batch_id = $1`,
        [statusBatchId]
      );
      
      const result = await pool.query(
        'SELECT * FROM processing_status WHERE batch_id = $1',
        [statusBatchId]
      );
      
      assert.strictEqual(result.rows[0].status, 'completed');
      assert(result.rows[0].completed_at !== null, 'Should have completion timestamp');
    });
  });
});

// Export for use in other tests
module.exports = { ensureDatabaseSchema };