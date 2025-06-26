# Reichman Jorgensen Firm Authentication System

## Overview

The AI Legal application uses a secure authentication system restricted to Reichman Jorgensen firm employees only. The system validates users based on their firm email address (@reichmanjorgensen.com) and credentials stored in the database.

## Security Features

1. **Email Domain Restriction**: Only @reichmanjorgensen.com email addresses can sign in
2. **Password Hashing**: All passwords are hashed using bcrypt
3. **Database Sessions**: Sessions are stored in PostgreSQL for better security
4. **Session Timeout**: 8-hour session expiry for security
5. **HTTPS Required**: Always use HTTPS in production

## Setting Up Employee Accounts

### Prerequisites
- PostgreSQL database configured
- Node.js installed
- Database migrations run (`npx prisma db push`)

### Creating New Employee Accounts

Use the provided script to create Reichman Jorgensen employee accounts:

```bash
node scripts/create-user.js
```

The script will prompt for:
- Employee name
- Employee email (must end with @reichmanjorgensen.com)
- Password

### Manual Database Entry

Alternatively, you can manually insert users into the database:

```sql
INSERT INTO "User" (id, name, email, password, "emailVerified", "createdAt", "updatedAt")
VALUES (
  'cuid_here',
  'John Doe',
  'john.doe@reichmanjorgensen.com',
  '$2a$10$hashed_password_here', -- Use bcrypt to hash
  NOW(),
  NOW(),
  NOW()
);
```

## Authentication Flow

1. Employee enters @reichmanjorgensen.com email and password
2. System validates email domain
3. Credentials checked against database
4. Database session created on successful login
5. Session expires after 8 hours

## Environment Variables

Required environment variables for authentication:

```env
# Authentication Secret (generate with: openssl rand -base64 32)
NEXTAUTH_SECRET=your-secret-key-here

# Application URL
NEXTAUTH_URL=https://legal.rjlf.com

# Database Connection
DATABASE_URL=postgresql://user:password@localhost:5432/lawyerchat
```

## Security Best Practices

1. **Strong Passwords**: Enforce minimum 12 characters with complexity requirements
2. **HTTPS Only**: Never run authentication over HTTP in production
3. **IP Allowlisting**: Consider restricting access to firm IP addresses
4. **Regular Audits**: Review user accounts regularly
5. **Password Rotation**: Implement periodic password changes

## Future Enhancements

### Option 1: Active Directory Integration
Integrate with Reichman Jorgensen's existing Active Directory for single sign-on:
- Use LDAP provider for NextAuth
- Sync with firm's employee directory
- Automatic account provisioning

### Option 2: Multi-Factor Authentication
Add additional security layer:
- TOTP (Time-based One-Time Password)
- SMS verification
- Email verification codes

### Option 3: IP Restriction
Implement IP-based access control:
- Allowlist firm office IPs
- VPN integration for remote access
- Geo-blocking for additional security

## Troubleshooting

### Common Issues

1. **"Only Reichman Jorgensen firm employees can sign in"**
   - Ensure email ends with @reichmanjorgensen.com
   - Check for typos in email address

2. **"Invalid credentials"**
   - Verify password is correct
   - Check if user account exists in database

3. **Session expires quickly**
   - Normal behavior (8-hour timeout)
   - Re-authenticate when prompted

### Support

For authentication issues, contact:
- IT Support: it@reichmanjorgensen.com
- System Admin: admin@reichmanjorgensen.com

## Migration from Google OAuth

The system has been migrated from Google OAuth to firm-specific authentication:
- Removed Google OAuth provider
- Implemented credentials-based authentication
- Added email domain validation
- Enhanced security with database sessions

All Reichman Jorgensen employees must now use their firm email and password to access the system.