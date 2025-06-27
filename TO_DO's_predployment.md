  1. Get Your Office 365 App Password

  Since Office 365 uses modern authentication, you need an App
   Password:

  1. Go to https://portal.office365.com and sign in
  2. Navigate to Security settings → Additional security 
  verification
  3. Click "Create and manage app passwords"
  4. Create a new app password named "AI Legal"
  5. Copy the generated password (save it - it won't be shown
  again!)

  2. Update Your .env File

  Replace YOUR_APP_PASSWORD_HERE in the .env file with your
  actual app password:

  SMTP_PASS=YOUR_APP_PASSWORD_HERE

  3. Test Your Email Configuration

  I've created a test script for you. Run it to verify
  everything works:

  node scripts/test-email.js

  This script will:
  - ✅ Check all required environment variables
  - ✅ Test the SMTP connection
  - ✅ Optionally send a test email to verify everything works

  4. How It Works Now

  With the current configuration:
  - Email sending is ENABLED in development mode
  (ENABLE_EMAIL=true)
  - When users register with their @reichmanjorgensen.com
  email, they'll receive a real verification email
  - The email will contain a link to verify their account
  - Once verified, they can sign in and use all features

  5. Important Notes

  - Office 365 Requirements: Your account must have SMTP
  enabled (most business accounts do)
  - Firewall: Ensure port 587 is open for outbound connections
  - App Password: Use the app password, NOT your regular
  Office 365 password
  - From Address: The SMTP_USER and FROM email should match

  Need to switch back to console logging?

  If you want to disable real emails temporarily, just change
  in .env:
  ENABLE_EMAIL=false

  The system will then log verification URLs to the console
  instead of sending emails.

  Try running the test script and let me know if you encounter
   any issues!


  ✅ Email System Ready for Deployment

  Current Setup:

  1. Email configuration is in place in .env file
  2. Flexible email system that works in both development and
  production
  3. Office 365 SMTP settings pre-configured
  4. Email verification workflow fully implemented

  For Deployment:

  - Just add the Office 365 app password to SMTP_PASS in .env
  - The system will automatically send verification emails to
  new users
  - All RJLF employees (@reichmanjorgensen.com) can register
  and receive verification emails

  Current State:

  - Development mode: Currently shows verification links in
  console (for easy testing)
  - Production mode: Will send real emails once app password
  is added
  - Toggle control: ENABLE_EMAIL=true in .env to activate
  email sending even in dev mode