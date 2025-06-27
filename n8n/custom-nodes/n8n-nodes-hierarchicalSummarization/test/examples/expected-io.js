/**
 * Expected Input/Output Examples for Hierarchical Summarization Node
 * 
 * This file demonstrates various input scenarios and their expected outputs
 */

// Example 1: Basic Directory Input
const example1_input = {
  json: {
    // Node parameters
    summaryPrompt: "summarize the content between the two tokens <c></c> in two or less sentences",
    contextPrompt: "Focus on key legal provisions and their implications",
    contentSource: "directory",
    directoryPath: "/path/to/legal/documents",
    batchSize: 2048,
    databaseConfig: "connected"
  }
};

const example1_output = {
  json: {
    batchId: "550e8400-e29b-41d4-a716-446655440000", // UUID generated
    finalSummary: "The consolidated legal framework establishes comprehensive regulations for data protection and privacy rights across multiple jurisdictions. Key provisions include mandatory consent requirements, data minimization principles, and significant penalties for non-compliance ranging from 2% to 4% of global annual revenue.",
    totalDocuments: 12,
    hierarchyDepth: 3,
    processingComplete: true
  }
};

// Example 2: Previous Node Input (Single Document)
const example2_input = {
  json: {
    content: `TERMS OF SERVICE AGREEMENT

1. ACCEPTANCE OF TERMS
By accessing and using this service, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.

2. USE LICENSE
Permission is granted to temporarily download one copy of the materials for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
- modify or copy the materials
- use the materials for any commercial purpose or for any public display
- attempt to reverse engineer any software contained on the service
- remove any copyright or other proprietary notations from the materials

3. DISCLAIMER
The materials on this service are provided "as is". We make no warranties, expressed or implied, and hereby disclaim and negate all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.

4. LIMITATIONS
In no event shall our organization or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on this service, even if we or our authorized representative has been notified orally or in writing of the possibility of such damage.

5. PRIVACY POLICY
Your privacy is important to us. Our privacy policy explains how we collect, use, and protect your personal information when you use our service. By using our service, you agree to the collection and use of information in accordance with our privacy policy.

6. USER CONTENT
Users may post content as long as it is not obscene, illegal, defamatory, threatening, infringing of intellectual property rights, invasive of privacy or injurious in any other way to third parties. Content has to be free of software viruses, political campaign, and commercial solicitation.

7. TERMINATION
We may terminate or suspend your account and bar access to the service immediately, without prior notice or liability, under our sole discretion, for any reason whatsoever and without limitation, including but not limited to a breach of the Terms.

8. GOVERNING LAW
These Terms shall be governed and construed in accordance with the laws of the United States, without regard to its conflict of law provisions. Our failure to enforce any right or provision of these Terms will not be considered a waiver of those rights.`,
    // Parameters
    summaryPrompt: "summarize the content between the two tokens <c></c> in two or less sentences",
    contextPrompt: "",
    contentSource: "previousNode",
    batchSize: 1024,
    databaseConfig: "manual",
    dbHost: "localhost",
    dbName: "n8n_summaries",
    dbUser: "postgres",
    dbPassword: "password123",
    dbPort: 5432
  }
};

const example2_output = {
  json: {
    batchId: "660e8400-e29b-41d4-a716-446655440001",
    finalSummary: "This Terms of Service agreement outlines user obligations including license restrictions, disclaimers of warranties, liability limitations, privacy policy compliance, content guidelines, and termination conditions. The agreement is governed by U.S. law and grants limited non-commercial use while protecting the service provider from various liabilities.",
    totalDocuments: 1,
    hierarchyDepth: 0, // Single document doesn't need hierarchy
    processingComplete: true
  }
};

// Example 3: Multiple Documents from Previous Node (Array Input)
const example3_input = [
  {
    json: {
      content: "Document 1: The patient presented with symptoms of acute respiratory distress...",
      metadata: { source: "medical_record_001.txt", date: "2024-01-15" }
    }
  },
  {
    json: {
      content: "Document 2: Laboratory results indicate elevated white blood cell count...",
      metadata: { source: "lab_results_001.txt", date: "2024-01-16" }
    }
  },
  {
    json: {
      content: "Document 3: Treatment protocol initiated with broad-spectrum antibiotics...",
      metadata: { source: "treatment_notes_001.txt", date: "2024-01-17" }
    }
  }
];

const example3_expected_output = {
  json: {
    batchId: "770e8400-e29b-41d4-a716-446655440002",
    finalSummary: "Patient case involving acute respiratory distress with elevated white blood cell count indicating possible infection. Treatment with broad-spectrum antibiotics was initiated and showed positive response within 48 hours.",
    totalDocuments: 3,
    hierarchyDepth: 1, // Documents → Summary
    processingComplete: true
  }
};

// Example 4: Large Document Collection Requiring Deep Hierarchy
const example4_scenario = {
  description: "Processing 100 legal contracts with small batch size",
  input: {
    json: {
      summaryPrompt: "summarize the content between the two tokens <c></c> focusing on key obligations and penalties",
      contextPrompt: "This is part of a contract review for merger due diligence",
      contentSource: "directory",
      directoryPath: "/contracts/merger_2024/",
      batchSize: 512, // Small batch size will create more chunks and deeper hierarchy
      databaseConfig: "credentials" // Using n8n stored credentials
    }
  },
  expected_output_structure: {
    json: {
      batchId: "UUID",
      finalSummary: "Comprehensive summary of all 100 contracts...",
      totalDocuments: 100,
      hierarchyDepth: 5, // Multiple levels due to small batch size
      processingComplete: true
    }
  }
};

// Example 5: Error Cases
const example5_error_cases = [
  {
    description: "Batch size too small",
    input: {
      json: {
        summaryPrompt: "This is an extremely long prompt that uses many tokens for testing purposes and will exceed the small batch size limit",
        batchSize: 100,
        contentSource: "previousNode",
        content: "Test content"
      }
    },
    expected_error: "Batch size 100 too small for prompts"
  },
  {
    description: "Invalid directory path",
    input: {
      json: {
        contentSource: "directory",
        directoryPath: "/non/existent/path",
        batchSize: 2048
      }
    },
    expected_error: "Cannot access directory: ENOENT: no such file or directory"
  },
  {
    description: "No content in previous node",
    input: {
      json: {
        contentSource: "previousNode",
        // Missing content field
        batchSize: 2048
      }
    },
    expected_error: "No content field found in input data"
  }
];

// Example 6: Database Schema Created
const database_schema_created = {
  tables: {
    hierarchical_documents: {
      columns: [
        "id SERIAL PRIMARY KEY",
        "content TEXT NOT NULL",
        "summary TEXT",
        "batch_id VARCHAR(255) NOT NULL",
        "hierarchy_level INTEGER NOT NULL",
        "parent_id INTEGER REFERENCES hierarchical_documents(id)",
        "child_ids INTEGER[] DEFAULT '{}'",
        "metadata JSONB DEFAULT '{}'",
        "token_count INTEGER NOT NULL",
        "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
        "updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP"
      ]
    },
    processing_status: {
      columns: [
        "id SERIAL PRIMARY KEY",
        "batch_id VARCHAR(255) UNIQUE NOT NULL",
        "current_level INTEGER NOT NULL DEFAULT 0",
        "total_documents INTEGER",
        "processed_documents INTEGER DEFAULT 0",
        "status VARCHAR(50) NOT NULL DEFAULT 'processing'",
        "error_message TEXT",
        "started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
        "completed_at TIMESTAMP"
      ]
    }
  }
};

// Example 7: Intermediate Processing State (What happens in the database)
const example7_intermediate_state = {
  level_0_documents: [
    {
      id: 1,
      content: "Full text of document 1...",
      batch_id: "550e8400-e29b-41d4-a716-446655440000",
      hierarchy_level: 0,
      parent_id: null,
      child_ids: [5],
      metadata: { filename: "contract_001.txt" },
      token_count: 1523
    },
    {
      id: 2,
      content: "Full text of document 2...",
      batch_id: "550e8400-e29b-41d4-a716-446655440000",
      hierarchy_level: 0,
      parent_id: null,
      child_ids: [5],
      metadata: { filename: "contract_002.txt" },
      token_count: 1876
    }
  ],
  level_1_summaries: [
    {
      id: 5,
      content: "",
      summary: "Documents 1 and 2 establish vendor agreements with similar payment terms...",
      batch_id: "550e8400-e29b-41d4-a716-446655440000",
      hierarchy_level: 1,
      parent_id: null, // Could reference a meta-parent
      child_ids: [10],
      token_count: 256
    }
  ],
  final_summary: {
    id: 10,
    content: "",
    summary: "The complete document set establishes a comprehensive vendor management framework...",
    batch_id: "550e8400-e29b-41d4-a716-446655440000",
    hierarchy_level: 2,
    parent_id: null,
    child_ids: [],
    token_count: 198
  }
};

// Example 8: Chunking Behavior with Different Batch Sizes
const example8_chunking = {
  original_document: {
    content: "A".repeat(4000), // 4000 chars = ~1000 tokens
    metadata: { source: "large_doc.txt" }
  },
  
  with_small_batch_size_256: {
    // Prompt uses ~20 tokens, safety buffer 50, so ~186 tokens per chunk
    expected_chunks: 6, // 1000 tokens / ~186 tokens per chunk
    chunk_example: {
      content: "A".repeat(744), // 186 tokens * 4 chars
      index: 0,
      tokenCount: 186
    }
  },
  
  with_medium_batch_size_1024: {
    // ~954 tokens available per chunk
    expected_chunks: 2,
    chunk_example: {
      content: "A".repeat(3816), // 954 tokens * 4 chars
      index: 0,
      tokenCount: 954
    }
  },
  
  with_large_batch_size_4096: {
    // Document fits in single chunk
    expected_chunks: 1,
    chunk_example: {
      content: "A".repeat(4000),
      index: 0,
      tokenCount: 1000
    }
  }
};

// Example 9: Connected AI Model Response Format
const example9_ai_model_interaction = {
  request_to_language_model: {
    messages: [
      {
        role: "system",
        content: "summarize the content between the two tokens <c></c> in two or less sentences"
      },
      {
        role: "user",
        content: "<c>The defendant was found guilty of breaching contract terms by failing to deliver goods within the specified timeframe. The court awarded damages of $250,000 to the plaintiff.</c>"
      }
    ],
    options: {
      temperature: 0.3,
      maxTokensToSample: 150
    }
  },
  
  expected_response: {
    text: "The defendant breached contract by late delivery and was ordered to pay $250,000 in damages. The court ruled in favor of the plaintiff due to failure to meet agreed delivery timeframes."
  }
};

// Export for testing
module.exports = {
  example1_input,
  example1_output,
  example2_input,
  example2_output,
  example3_input,
  example3_expected_output,
  example4_scenario,
  example5_error_cases,
  database_schema_created,
  example7_intermediate_state,
  example8_chunking,
  example9_ai_model_interaction
};