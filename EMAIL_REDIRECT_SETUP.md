# Email Redirect URL Setup Guide

## Problem
When users sign up, the confirmation email contains a link that redirects to `localhost` instead of your production URL.

## Root Cause
The app uses `window.location.origin` as a fallback, which means:
- If you sign up on `localhost:8080`, the email link will be `http://localhost:8080`
- If you sign up on production, but `VITE_SITE_URL` isn't set, it might still use localhost

## Solution

### Step 1: Set Environment Variable in Production

**CRITICAL:** Add `VITE_SITE_URL` to your production environment variables (not just `.env`):

**For Vercel/Netlify/etc:**
1. Go to your hosting platform's dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add:
   - Key: `VITE_SITE_URL`
   - Value: `https://your-actual-domain.com` (your production URL)
   - Environment: Production

**For manual deployment:**
Add to your `.env` file:
```env
VITE_SITE_URL=https://your-actual-domain.com
```

**Important:** 
- Replace `https://your-actual-domain.com` with your actual production domain
- Do NOT include a trailing slash
- This MUST be set in your production environment

### Step 2: Configure Supabase Site URL

1. Go to your Supabase Dashboard
2. Navigate to **Authentication** → **URL Configuration**
3. Set **Site URL** to your production URL:
   ```
   https://your-actual-domain.com
   ```

4. Under **Redirect URLs**, add:
   - `https://your-actual-domain.com/**` (your production URL with wildcard)
   - `http://localhost:5173/**` (for local development - optional)
   - `http://localhost:8080/**` (if you use port 8080 - optional)

5. Click **Save**

### Step 3: Rebuild and Redeploy

After setting `VITE_SITE_URL` in production:

```bash
npm run build
```

Then redeploy your app. The environment variable is baked into the build at build time.

### Step 4: Verify

1. Sign up a new user on your **production site** (not localhost)
2. Check the confirmation email
3. The confirmation link should now point to your production URL, not localhost
4. Click the link - it should redirect to your production site

## For Different Environments

### Development (Local)
You can leave `VITE_SITE_URL` empty or set it to `http://localhost:5173` (or your dev port)

### Production
**MUST** set `VITE_SITE_URL` to your production domain:
```env
VITE_SITE_URL=https://yourdomain.com
```

### Staging
Set it to your staging domain:
```env
VITE_SITE_URL=https://staging.yourdomain.com
```

## Troubleshooting

### Email still has localhost URL
- Make sure `VITE_SITE_URL` is set in your production environment
- Rebuild your app after setting the variable
- Check that the variable is actually being read (check browser console)

### Redirect URL not allowed error
- Make sure you've added your production URL to Supabase's allowed redirect URLs
- Check that the URL matches exactly (including https/http and trailing slash)

### Works locally but not in production
- Verify `VITE_SITE_URL` is set in your production environment variables
- Check your hosting platform's environment variable configuration
- Rebuild and redeploy after setting the variable

