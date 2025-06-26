# Email Configuration Guide

## Overview

The Lawyer-Chat application now has full email sending capabilities for:
- Email verification during registration
- Password reset functionality
- Future notifications and updates

## Email Sending Modes

### 1. Development Mode (Default)
In development, emails are logged to the console instead of being sent:
```
=================================
VERIFICATION EMAIL (DEV MODE)
To: user@example.com
Verification URL: http://localhost:3001/api/auth/verify?email=...
=================================
```

### 2. Test Mode (No SMTP Config)
When no SMTP credentials are provided, the system uses Ethereal Email (a fake SMTP service):
- Emails are captured but not delivered
- Preview URLs are logged to console
- Perfect for testing without real email setup

### 3. Production Mode (With SMTP)
When SMTP credentials are configured, real emails are sent using your email service.

## Configuration Options

Add these to your `.env.local` file:

### Option 1: Office 365 / Outlook
```env
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=your-email@reichmanjorgensen.com
SMTP_PASS=your-password
SMTP_FROM=AI Legal <noreply@reichmanjorgensen.com>
```

### Option 2: Gmail (Requires App Password)
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password  # Not your regular password!
SMTP_FROM=AI Legal <your-email@gmail.com>
```

To get a Gmail App Password:
1. Enable 2-factor authentication
2. Go to https://myaccount.google.com/apppasswords
3. Generate an app-specific password

### Option 3: SendGrid
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey  # Always 'apikey' for SendGrid
SMTP_PASS=your-sendgrid-api-key
SMTP_FROM=AI Legal <noreply@reichmanjorgensen.com>
```

### Option 4: Other SMTP Services
Most SMTP services follow a similar pattern:
```env
SMTP_HOST=your-smtp-server.com
SMTP_PORT=587  # or 465 for SSL, 25 for unencrypted
SMTP_USER=your-username
SMTP_PASS=your-password
SMTP_FROM=AI Legal <sender@yourdomain.com>
```

## Testing Email Configuration

### 1. Test Email Script
```bash
# Test verification email
npm run test-email -- --to your-email@reichmanjorgensen.com

# Test password reset email
npm run test-email -- --to your-email@reichmanjorgensen.com --type reset
```

### 2. Register a New User
1. Go to http://localhost:3001/auth/register
2. Fill in the registration form
3. Check console (dev mode) or email inbox

### 3. Verify SMTP Connection
The test script will show:
- ✅ Success: Email sent successfully
- ❌ Error: Connection or authentication issues

## Email Templates

The system includes professional HTML email templates for:

### Verification Email
- Company branding (blue/gold colors)
- Clear call-to-action button
- 24-hour expiration notice
- Fallback text version

### Password Reset Email
- Similar design to verification
- 1-hour expiration for security
- Clear security notice

## Troubleshooting

### Common Issues

1. **"Email configuration not set up"**
   - Add SMTP settings to `.env.local`
   - Restart the development server

2. **"Invalid login: 535 Authentication failed"**
   - Check username/password
   - For Gmail, use App Password not regular password
   - For Office 365, ensure account has SMTP enabled

3. **"Connection timeout"**
   - Check firewall settings
   - Verify SMTP host and port
   - Some corporate networks block SMTP

4. **"Self signed certificate in certificate chain"**
   - The code includes `rejectUnauthorized: false` for development
   - For production, use proper SSL certificates

### Security Considerations

1. **Never commit SMTP credentials**
   - Keep them in `.env.local` (gitignored)
   - Use environment variables in production

2. **Use App-Specific Passwords**
   - Don't use your main email password
   - Generate app-specific credentials

3. **Rate Limiting**
   - The app includes rate limiting for auth endpoints
   - Consider additional limits for email sending

4. **Email Verification Required**
   - Users must verify email before signing in
   - Tokens expire after 24 hours

## Production Deployment

For production:

1. Set environment variables on your hosting platform
2. Use a reliable email service (SendGrid, AWS SES, etc.)
3. Monitor email delivery rates
4. Set up SPF/DKIM records for your domain
5. Consider email queuing for reliability

## Future Enhancements

The email system is ready for:
- Welcome emails
- Chat summaries
- Security alerts
- System notifications
- Newsletter integration

The infrastructure is in place and tested, ready for production use!