import crypto from 'crypto';

// Generate API key
export function generateApiKey(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Create HMAC signature for request
export function createSignature(payload: string, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
}

// Verify signature
export function verifySignature(
  payload: string, 
  signature: string, 
  secret: string
): boolean {
  const expectedSignature = createSignature(payload, secret);
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// Add authentication headers
export function getAuthHeaders(payload: any): Record<string, string> {
  const apiKey = process.env.N8N_API_KEY;
  const apiSecret = process.env.N8N_API_SECRET;
  
  if (!apiKey || !apiSecret) {
    console.warn('API authentication not configured');
    return {};
  }
  
  const timestamp = Date.now().toString();
  const payloadString = JSON.stringify(payload);
  const signaturePayload = `${timestamp}.${payloadString}`;
  const signature = createSignature(signaturePayload, apiSecret);
  
  return {
    'X-API-Key': apiKey,
    'X-Timestamp': timestamp,
    'X-Signature': signature
  };
}