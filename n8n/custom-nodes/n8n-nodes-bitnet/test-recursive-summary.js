const axios = require('axios');

// Test recursive summary functionality
async function testRecursiveSummary() {
    const serverUrl = 'http://localhost:8081';
    
    // Test text that should trigger chunking
    const testText = `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. `.repeat(20);
    
    console.log('Test text length:', testText.length);
    console.log('\nTesting BitNet server connection...');
    
    try {
        // First test if server is running
        const healthResponse = await axios.get(`${serverUrl}/health`);
        console.log('✓ Server health check:', healthResponse.data);
        
        // Test a simple completion
        console.log('\nTesting simple completion...');
        const completionResponse = await axios.post(`${serverUrl}/completion`, {
            prompt: "Summarize in one sentence: The quick brown fox jumps over the lazy dog.",
            temperature: 0.7,
            max_tokens: 50
        });
        
        console.log('✓ Simple completion response:', completionResponse.data);
        
        // Now test chunking and summarization
        console.log('\nTesting chunk summarization...');
        const chunkSize = 500;
        const chunks = [];
        
        // Split text into chunks
        for (let i = 0; i < testText.length; i += chunkSize) {
            chunks.push(testText.substring(i, i + chunkSize));
        }
        
        console.log(`Created ${chunks.length} chunks`);
        
        // Summarize each chunk
        const summaries = [];
        for (let i = 0; i < chunks.length; i++) {
            console.log(`\nSummarizing chunk ${i + 1}/${chunks.length}...`);
            
            const prompt = `Create a concise summary of the following text:\n\n${chunks[i]}`;
            
            try {
                const response = await axios.post(`${serverUrl}/completion`, {
                    prompt: prompt,
                    temperature: 0.7,
                    max_tokens: Math.floor(chunks[i].length * 0.3 / 4), // Approximate token count
                    top_p: 0.9,
                    top_k: 40
                });
                
                const summaryText = response.data.choices?.[0]?.text || response.data.content || '';
                summaries.push(summaryText);
                console.log(`✓ Chunk ${i + 1} summary length:`, summaryText.length);
            } catch (error) {
                console.error(`✗ Error summarizing chunk ${i + 1}:`, error.message);
                if (error.response) {
                    console.error('Response data:', error.response.data);
                }
            }
        }
        
        console.log('\n✓ All chunks summarized successfully');
        console.log('Total summaries:', summaries.length);
        
    } catch (error) {
        console.error('✗ Error:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
    }
}

// Run the test
testRecursiveSummary();