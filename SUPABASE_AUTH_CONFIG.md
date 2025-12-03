# Supabase Authentication Configuration

## Required Settings in Supabase Dashboard

### 1. Site URL Configuration

Go to: **Authentication** → **URL Configuration**

Set these values:

- **Site URL**: `http://localhost:1729` (for development)
- **Redirect URLs**: Add these:
  ```
  http://localhost:1729/auth/callback
  http://localhost:1729/**
  ```

For production, also add:

- Site URL: `https://yourdomain.com`
- Redirect URLs: `https://yourdomain.com/auth/callback`

### 2. Email Templates (Fix Redirect URL)

Go to: **Authentication** → **Email Templates**

For **Confirm signup** template:

- Find: `{{ .ConfirmationURL }}`
- Make sure it redirects to `/auth/callback`

### 3. Google OAuth Setup (Optional)

Go to: **Authentication** → **Providers** → **Google**

If you want Google OAuth:

1. Enable Google provider
2. Add Client ID and Secret from Google Cloud Console
3. Add authorized redirect URI: `https://cfhssgueszhoracjeyou.supabase.co/auth/v1/callback`

### 4. Email Settings

Go to: **Authentication** → **Email**

Make sure:

- ✅ Enable email confirmations
- ✅ Secure email change enabled
- Email confirmation: 24 hours (default)

## Current Issues

The "Load failed" TypeError and "otp_expired" errors suggest:

1. Email verification links are expiring (normal if old)
2. The redirect URL might not be configured correctly in Supabase

## Fix Steps

1. **Update Site URL in Supabase**:
   - Set to `http://localhost:1729`
   - Add redirect URL: `http://localhost:1729/auth/callback`

2. **Try Fresh Signup**:
   - Sign up with a new email
   - Check email immediately
   - Click verification link within a few minutes

3. **Alternative - Disable Email Confirmation** (for development):
   - Go to Authentication → Providers → Email
   - Toggle OFF "Confirm email"
   - Now signups will work immediately without email verification

## Testing Without Email Verification

For faster development, you can disable email confirmation:

1. Supabase Dashboard → Authentication → Providers → Email
2. Turn OFF "Confirm email"
3. Users can login immediately after signup

Re-enable it before production!
