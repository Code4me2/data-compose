import crypto from 'crypto';
import { cookies } from 'next/headers';

const CSRF_SECRET_NAME = 'csrf-secret';

// Generate CSRF token
export async function generateCsrfToken(): Promise<string> {
  const secret = crypto.randomBytes(32).toString('hex');
  const token = crypto.randomBytes(32).toString('hex');
  
  // Store secret in httpOnly cookie
  const cookieStore = await cookies();
  cookieStore.set(CSRF_SECRET_NAME, secret, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 // 24 hours
  });
  
  // Create signed token
  const signedToken = `${token}.${crypto
    .createHmac('sha256', secret)
    .update(token)
    .digest('hex')}`;
  
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
  
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(tokenPart)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
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