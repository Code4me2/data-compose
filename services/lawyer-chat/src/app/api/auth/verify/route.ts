import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get('token');
    const email = searchParams.get('email');

    if (!token || !email) {
      return new Response(
        JSON.stringify({ error: 'Invalid verification link' }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Find user with matching token
    const user = await prisma.user.findFirst({
      where: {
        email: email.toLowerCase(),
        registrationToken: token,
        registrationTokenExpires: {
          gt: new Date() // Token not expired
        }
      }
    });

    if (!user) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid or expired verification link. Please register again.' 
        }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verify the user
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: new Date(),
        registrationToken: null,
        registrationTokenExpires: null
      }
    });

    // Log successful verification
    await prisma.auditLog.create({
      data: {
        action: 'EMAIL_VERIFICATION',
        userId: user.id,
        email: user.email,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        success: true
      }
    });

    // Redirect to sign-in page with success message
    return Response.redirect(
      new URL('/auth/signin?verified=true', request.url)
    );

  } catch (error) {
    console.error('Verification error:', error);
    
    return new Response(
      JSON.stringify({ error: 'Verification failed. Please try again.' }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}