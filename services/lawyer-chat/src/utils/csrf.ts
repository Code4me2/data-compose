import { cookies } from 'next/headers';

const CSRF_SECRET_NAME = 'csrf-secret';

// Convert ArrayBuffer to hex string
function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Convert hex string to Uint8Array
function hexToUint8Array(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

// Generate random bytes using Web Crypto API
async function generateRandomBytes(length: number): Promise<string> {
  const buffer = new Uint8Array(length);
  crypto.getRandomValues(buffer);
  return bufferToHex(buffer.buffer);
}

// Create HMAC using Web Crypto API
async function createHmac(secret: string, data: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const dataBuffer = encoder.encode(data);
  
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', key, dataBuffer);
  return bufferToHex(signature);
}

// Generate CSRF token
export async function generateCsrfToken(): Promise<string> {
  const secret = await generateRandomBytes(32);
  const token = await generateRandomBytes(32);
  
  // Store secret in httpOnly cookie
  const cookieStore = await cookies();
  cookieStore.set(CSRF_SECRET_NAME, secret, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 // 24 hours
  });
  
  // Create signed token
  const signature = await createHmac(secret, token);
  const signedToken = `${token}.${signature}`;
  
  return signedToken;
}

// Verify CSRF token
export async function verifyCsrfToken(token: string | null): Promise<boolean> {
  if (!token) return false;
  
  const cookieStore = await cookies();
  const secret = cookieStore.get(CSRF_SECRET_NAME)?.value;
  
  if (!secret) return false;
  
  const [tokenPart, signature] = token.split('.');
  if (!tokenPart || !signature) return false;
  
  const expectedSignature = await createHmac(secret, tokenPart);
  
  // Timing-safe comparison
  if (signature.length !== expectedSignature.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < signature.length; i++) {
    result |= signature.charCodeAt(i) ^ expectedSignature.charCodeAt(i);
  }
  
  return result === 0;
}

// Middleware to check CSRF for state-changing requests
export async function checkCsrf(request: Request): Promise<boolean> {
  // Skip CSRF check for GET and HEAD requests
  if (['GET', 'HEAD'].includes(request.method)) {
    return true;
  }
  
  // Get token from header or body
  const token = request.headers.get('X-CSRF-Token') || 
                request.headers.get('x-csrf-token');
  
  return verifyCsrfToken(token);
}