/**
 * Demo Test - Shows actual input/output behavior
 * 
 * Run with: node test/examples/demo-test.js
 */

const assert = require('assert');

// Simulate the node's core processing functions
const CHARS_PER_TOKEN = 4;

function estimateTokenCount(text) {
  const normalizedText = text.replace(/\s+/g, ' ').trim();
  return Math.ceil(normalizedText.length / CHARS_PER_TOKEN);
}

function splitIntoSentences(text) {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  return sentences.map(s => s.trim()).filter(s => s.length > 0);
}

async function simulateNodeExecution(inputData, nodeParameters) {
  console.log('\n=== HIERARCHICAL SUMMARIZATION NODE DEMO ===\n');
  
  // Extract parameters
  const {
    summaryPrompt = "summarize the content between the two tokens <c></c> in two or less sentences",
    contextPrompt = "",
    batchSize = 2048,
    contentSource = "previousNode"
  } = nodeParameters;
  
  console.log('📝 Node Configuration:');
  console.log(`   Summary Prompt: "${summaryPrompt}"`);
  console.log(`   Context Prompt: "${contextPrompt}"`);
  console.log(`   Batch Size: ${batchSize} tokens`);
  console.log(`   Content Source: ${contentSource}`);
  
  // Process input data
  let documentsToProcess = [];
  
  if (contentSource === "previousNode") {
    if (Array.isArray(inputData)) {
      documentsToProcess = inputData.map((item, i) => ({
        name: `document_${i}`,
        content: item.json.content
      }));
    } else {
      documentsToProcess = [{
        name: "document_0",
        content: inputData.json.content
      }];
    }
  }
  
  console.log(`\n📄 Input Documents: ${documentsToProcess.length}`);
  documentsToProcess.forEach((doc, i) => {
    const tokens = estimateTokenCount(doc.content);
    const preview = doc.content.substring(0, 80) + (doc.content.length > 80 ? "..." : "");
    console.log(`   ${i + 1}. ${doc.name} (${tokens} tokens): "${preview}"`);
  });
  
  // Simulate chunking process
  console.log('\n🔄 Processing Phase:');
  
  const promptTokens = estimateTokenCount(summaryPrompt + contextPrompt);
  const contentTokenBudget = batchSize - promptTokens - 50;
  
  console.log(`   Token Budget: ${batchSize} total - ${promptTokens} prompts - 50 buffer = ${contentTokenBudget} per chunk`);
  
  let allChunks = [];
  let totalTokens = 0;
  
  for (const doc of documentsToProcess) {
    const docTokens = estimateTokenCount(doc.content);
    totalTokens += docTokens;
    
    if (docTokens <= contentTokenBudget) {
      console.log(`   ✓ ${doc.name}: Fits in single chunk (${docTokens} tokens)`);
      allChunks.push({
        document: doc.name,
        content: doc.content,
        tokenCount: docTokens
      });
    } else {
      // Simulate chunking
      const sentences = splitIntoSentences(doc.content);
      let currentChunk = [];
      let currentTokens = 0;
      let chunkIndex = 0;
      
      for (const sentence of sentences) {
        const sentenceTokens = estimateTokenCount(sentence);
        
        if (currentTokens + sentenceTokens > contentTokenBudget && currentChunk.length > 0) {
          allChunks.push({
            document: `${doc.name}_chunk_${chunkIndex}`,
            content: currentChunk.join(' '),
            tokenCount: currentTokens
          });
          console.log(`   ✓ ${doc.name}_chunk_${chunkIndex}: ${currentTokens} tokens`);
          
          currentChunk = [sentence];
          currentTokens = sentenceTokens;
          chunkIndex++;
        } else {
          currentChunk.push(sentence);
          currentTokens += sentenceTokens;
        }
      }
      
      if (currentChunk.length > 0) {
        allChunks.push({
          document: `${doc.name}_chunk_${chunkIndex}`,
          content: currentChunk.join(' '),
          tokenCount: currentTokens
        });
        console.log(`   ✓ ${doc.name}_chunk_${chunkIndex}: ${currentTokens} tokens`);
      }
      
      console.log(`   → ${doc.name}: Split into ${chunkIndex + 1} chunks`);
    }
  }
  
  // Simulate AI summarization (mock)
  console.log('\n🤖 AI Summarization Phase:');
  console.log(`   Processing ${allChunks.length} chunks through AI model...`);
  
  // Mock AI responses based on content
  const summaries = allChunks.map((chunk, i) => {
    let mockSummary;
    if (chunk.content.includes('contract') || chunk.content.includes('agreement')) {
      mockSummary = `Contract summary ${i + 1}: Key terms and obligations defined with specific compliance requirements.`;
    } else if (chunk.content.includes('privacy') || chunk.content.includes('data')) {
      mockSummary = `Privacy summary ${i + 1}: Data protection measures and user rights established with clear consent mechanisms.`;
    } else {
      mockSummary = `Document summary ${i + 1}: Important provisions and requirements outlined with implementation guidelines.`;
    }
    
    console.log(`   ✓ Chunk ${i + 1} → "${mockSummary}"`);
    return mockSummary;
  });
  
  // Simulate hierarchy building
  console.log('\n🏗️  Hierarchy Building:');
  
  let currentLevel = summaries;
  let hierarchyLevel = 1;
  
  while (currentLevel.length > 1) {
    console.log(`   Level ${hierarchyLevel}: Combining ${currentLevel.length} summaries`);
    
    const nextLevel = [];
    for (let i = 0; i < currentLevel.length; i += 2) {
      if (i + 1 < currentLevel.length) {
        // Combine two summaries
        const combined = `Combined summary: ${currentLevel[i]} ${currentLevel[i + 1]}`;
        nextLevel.push(combined);
        console.log(`   ✓ Combined summaries ${i + 1} & ${i + 2}`);
      } else {
        // Odd one out moves up
        nextLevel.push(currentLevel[i]);
        console.log(`   ✓ Summary ${i + 1} moves up unchanged`);
      }
    }
    
    currentLevel = nextLevel;
    hierarchyLevel++;
  }
  
  const finalSummary = currentLevel[0];
  const batchId = `demo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // Generate output
  const output = {
    json: {
      batchId: batchId,
      finalSummary: finalSummary,
      totalDocuments: documentsToProcess.length,
      hierarchyDepth: hierarchyLevel - 1,
      processingComplete: true,
      processingStats: {
        totalInputTokens: totalTokens,
        chunksCreated: allChunks.length,
        batchSizeUsed: batchSize,
        promptTokensUsed: promptTokens
      }
    }
  };
  
  console.log('\n✅ Final Output:');
  console.log('─'.repeat(60));
  console.log(JSON.stringify(output, null, 2));
  
  return output;
}

// Demo Test Cases
async function runDemos() {
  
  // Demo 1: Simple single document
  console.log('\n' + '='.repeat(80));
  console.log('DEMO 1: Single Document Processing');
  console.log('='.repeat(80));
  
  const demo1_input = {
    json: {
      content: "CONFIDENTIALITY AGREEMENT: This agreement establishes the terms under which confidential information may be shared between parties. The receiving party agrees to maintain strict confidentiality and use the information solely for evaluation purposes. Any breach of this agreement may result in legal action and damages."
    }
  };
  
  const demo1_params = {
    summaryPrompt: "summarize the content between the two tokens <c></c> in one sentence",
    contextPrompt: "Focus on legal obligations",
    batchSize: 1024,
    contentSource: "previousNode"
  };
  
  await simulateNodeExecution(demo1_input, demo1_params);
  
  // Demo 2: Multiple small documents
  console.log('\n' + '='.repeat(80));
  console.log('DEMO 2: Multiple Documents Processing');
  console.log('='.repeat(80));
  
  const demo2_input = [
    {
      json: {
        content: "Privacy Policy Section 1: We collect personal information when you register for our service. This includes name, email, and usage data."
      }
    },
    {
      json: {
        content: "Privacy Policy Section 2: Your data is stored securely using industry-standard encryption. We do not sell personal information to third parties."
      }
    },
    {
      json: {
        content: "Privacy Policy Section 3: You have the right to access, modify, or delete your personal data. Contact our privacy officer for data requests."
      }
    }
  ];
  
  const demo2_params = {
    summaryPrompt: "summarize the content between the two tokens <c></c> in one sentence",
    batchSize: 512,
    contentSource: "previousNode"
  };
  
  await simulateNodeExecution(demo2_input, demo2_params);
  
  // Demo 3: Large document requiring chunking
  console.log('\n' + '='.repeat(80));
  console.log('DEMO 3: Large Document with Chunking');
  console.log('='.repeat(80));
  
  const demo3_input = {
    json: {
      content: `MASTER SERVICE AGREEMENT

ARTICLE 1: DEFINITIONS AND INTERPRETATIONS
For the purposes of this Agreement, the following terms shall have the meanings set forth below. "Affiliate" means any entity that directly or indirectly controls, is controlled by, or is under common control with another entity. "Confidential Information" means any and all non-public, proprietary, or confidential information disclosed by one party to another.

ARTICLE 2: SCOPE OF SERVICES
The Service Provider agrees to provide the services described in the applicable Statement of Work. Each Statement of Work shall be deemed incorporated into and made part of this Agreement. The services shall be performed in accordance with industry standards and best practices.

ARTICLE 3: PAYMENT TERMS
Client agrees to pay all fees as specified in the applicable Statement of Work. Payment terms are net 30 days from invoice date. Late payments may incur interest charges at the rate of 1.5% per month or the maximum rate permitted by law, whichever is less.

ARTICLE 4: INTELLECTUAL PROPERTY
Each party retains ownership of its pre-existing intellectual property. Work product created specifically for Client under this Agreement shall be owned by Client upon full payment of all fees. Service Provider retains the right to use general knowledge and skills acquired during performance.

ARTICLE 5: CONFIDENTIALITY
Both parties acknowledge that they may have access to confidential information. Each party agrees to maintain the confidentiality of such information and not to disclose it to third parties without prior written consent. This obligation shall survive termination of this Agreement.

ARTICLE 6: LIMITATION OF LIABILITY
In no event shall either party be liable for any indirect, incidental, special, consequential, or punitive damages. The total liability of either party shall not exceed the total amount paid or payable under this Agreement in the twelve months preceding the claim.

ARTICLE 7: TERMINATION
Either party may terminate this Agreement with 30 days written notice. Upon termination, all unpaid fees become immediately due and payable. The provisions regarding confidentiality, intellectual property, and limitation of liability shall survive termination.`
    }
  };
  
  const demo3_params = {
    summaryPrompt: "summarize the content between the two tokens <c></c> in two sentences focusing on key legal terms",
    batchSize: 512, // Small batch to force chunking
    contentSource: "previousNode"
  };
  
  await simulateNodeExecution(demo3_input, demo3_params);
  
  console.log('\n' + '='.repeat(80));
  console.log('ALL DEMOS COMPLETED');
  console.log('='.repeat(80));
}

// Run demos if this file is executed directly
if (require.main === module) {
  runDemos().catch(console.error);
}

module.exports = {
  simulateNodeExecution,
  runDemos
};