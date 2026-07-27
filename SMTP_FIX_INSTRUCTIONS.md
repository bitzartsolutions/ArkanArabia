# Contact Form Email Issue - SOLUTIONS

## Problem Identified
The contact form is failing with error: **"525 5.7.1 Unauthorized IP address"**

This means your Brevo SMTP account requires IP whitelisting, and your current IP is not authorized.

---

## SOLUTION 1: Authorize Your IP in Brevo (RECOMMENDED)

1. **Login to Brevo**: Go to https://app.brevo.com/
2. **Navigate to SMTP Settings**: 
   - Click on your profile (top right)
   - Go to "SMTP & API"
   - Click on "SMTP" tab
3. **Add Authorized IPs**:
   - Find the "Authorized IPs" section
   - Click "Add an IP"
   - Add your current IP address
   - **OR** Add `0.0.0.0/0` to allow all IPs (less secure but works for development)
4. **Save** and test again

---

## SOLUTION 2: Use Brevo API Instead of SMTP (ALTERNATIVE)

The backend already has Brevo API support built-in. You need to:

1. **Get your Brevo API Key**:
   - Login to https://app.brevo.com/
   - Go to "SMTP & API" → "API Keys"
   - Copy your API key

2. **Update `.env` file** - Add this line:
   ```
   BREVO_API_KEY=your_api_key_here
   ```

3. **Restart the backend server**

The API method bypasses IP restrictions!

---

## SOLUTION 3: Use Gmail SMTP (ALTERNATIVE)

If you prefer using Gmail directly:

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate an App Password**:
   - Go to https://myaccount.google.com/apppasswords
   - Generate a new app password for "Mail"
3. **Update `.env` file**:
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-16-digit-app-password
   SMTP_FROM_EMAIL=your-email@gmail.com
   ```
4. **Restart the backend server**

---

## SOLUTION 4: Disable Email Temporarily (FOR TESTING ONLY)

If you just want to test the form without emails:

I can modify the backend to log inquiries to console instead of sending emails.

---

## Quick Test After Fix

Run this command to test:
```bash
node test-smtp.js
```

If successful, you'll see: ✅ Email sent successfully!

---

## Which Solution Do You Prefer?

1. **Solution 1** - Best for production with Brevo
2. **Solution 2** - Easiest, uses Brevo API (no IP restrictions)
3. **Solution 3** - If you want to use Gmail
4. **Solution 4** - For testing only
