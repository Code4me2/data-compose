/**
 * Utility functions for generating smart chat titles based on conversation content
 */

/**
 * Generate a concise, meaningful title from the first user message
 * @param userMessage - The first message from the user
 * @returns A title that captures the essence of the query
 */
export function generateChatTitle(userMessage: string): string {
  // Clean and normalize the message
  const cleaned = userMessage
    .trim()
    .replace(/[\n\r]+/g, ' ')  // Replace newlines with spaces
    .replace(/\s+/g, ' ');     // Normalize multiple spaces
  
  // Common greeting patterns to skip
  const greetingPatterns = /^(hi|hello|hey|good morning|good afternoon|good evening|greetings)/i;
  
  // Remove greetings if they're followed by actual content
  let processedMessage = cleaned;
  const greetingMatch = cleaned.match(greetingPatterns);
  if (greetingMatch && cleaned.length > greetingMatch[0].length + 10) {
    // Remove greeting and following punctuation/space
    processedMessage = cleaned
      .substring(greetingMatch[0].length)
      .replace(/^[,.\s]+/, '')
      .trim();
  }
  
  // Question patterns - extract the core question
  const questionPatterns = [
    /(?:can you|could you|would you|please|help me|i need to|i want to)\s+(.+)/i,
    /(?:what|how|why|when|where|who|which)\s+(.+)/i,
    /(?:tell me about|explain|describe)\s+(.+)/i,
    /(?:find|search for|look up)\s+(.+)/i,
  ];
  
  for (const pattern of questionPatterns) {
    const match = processedMessage.match(pattern);
    if (match && match[1]) {
      processedMessage = match[0]; // Keep the question word for context
      break;
    }
  }
  
  // Topic extraction - find key phrases
  const topicIndicators = [
    /about\s+(.+?)(?:\?|$)/i,
    /regarding\s+(.+?)(?:\?|$)/i,
    /(?:^|\s)(.+?)\s+(?:question|query|issue|problem|matter)/i,
  ];
  
  let extractedTopic = '';
  for (const pattern of topicIndicators) {
    const match = processedMessage.match(pattern);
    if (match && match[1]) {
      extractedTopic = match[1];
      break;
    }
  }
  
  // If we found a topic, use it; otherwise use the processed message
  const baseTitle = extractedTopic || processedMessage;
  
  // Clean up and shorten
  let title = baseTitle
    .replace(/[?!.,;:]+$/, '')  // Remove trailing punctuation
    .trim();
  
  // Smart truncation - try to cut at word boundaries
  const maxLength = 50;
  if (title.length > maxLength) {
    // Try to find a natural break point
    const cutoff = title.lastIndexOf(' ', maxLength);
    if (cutoff > 20) {
      title = title.substring(0, cutoff) + '...';
    } else {
      title = title.substring(0, maxLength) + '...';
    }
  }
  
  // Capitalize first letter
  title = title.charAt(0).toUpperCase() + title.slice(1);
  
  // Fallback if title is too short or empty
  if (title.length < 5) {
    title = cleaned.substring(0, 50) + (cleaned.length > 50 ? '...' : '');
  }
  
  return title;
}

/**
 * Examples of how this function works:
 * 
 * "Hi, can you find the current population growth rate of China?" 
 * → "Find the current population growth rate of China"
 * 
 * "What are the key elements of a valid contract?"
 * → "What are the key elements of a valid contract"
 * 
 * "Hello, I need help with understanding employment law"
 * → "Understanding employment law"
 * 
 * "Tell me about intellectual property rights"
 * → "Tell me about intellectual property rights"
 * 
 * "How do I file a patent application?"
 * → "How do I file a patent application"
 */