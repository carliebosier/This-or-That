# Complete Supabase Setup Guide

This guide will walk you through setting up a new Supabase project and connecting it to this application.

## Step 1: Create a New Supabase Project

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click **"New Project"**
3. Fill in the details:
   - **Organization**: Select or create an organization
   - **Name**: Give it a name (e.g., "say-it-quick")
   - **Database Password**: Create a strong password (save this in a password manager!)
   - **Region**: Choose the region closest to your users
   - **Pricing Plan**: Select Free tier (or your preferred plan)
4. Click **"Create new project"**
5. Wait 2-3 minutes for the project to be provisioned

## Step 2: Get Your Project Credentials

Once your project is ready:

1. In your Supabase Dashboard, go to **Settings** (gear icon) → **API**
2. You'll see two important values:
   - **Project URL** (looks like: `https://xxxxxxxxxxxxx.supabase.co`)
   - **anon public** key (starts with `eyJ...`)

3. Copy both of these values - you'll need them in the next step!

## Step 3: Create Environment Variables File

1. In your project root directory, create a new file called `.env`
2. Add the following content (replace with your actual values):

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-public-key-here
```

**Example:**
```env
VITE_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTY0NTI5ODQwMCwiZXhwIjoxOTYwODc0NDAwfQ.example
```

3. Save the file (make sure it's in the root directory, same level as `package.json`)

⚠️ **Important**: The `.env` file is already in `.gitignore`, so it won't be committed to git.

## Step 4: Set Up Database Schema (Run Migrations)

You need to apply all database migrations to set up your schema. You have two options:

### Option A: Using Supabase Dashboard SQL Editor (Recommended for first time)

1. In Supabase Dashboard, go to **SQL Editor**
2. For each migration file in order, copy and paste the SQL:

**Migration Order:**
1. `20251109172320_335caa2d-9e2c-43d1-a948-d071f6f12d88.sql` - Initial schema
2. `20251112230445_3db5d6cf-55ab-4aee-816e-4545ea9456b3.sql` - Guest identity functions
3. `20251112230536_d6a6212b-ea1d-4e44-8925-0727ab49d0b9.sql` - (Check contents if any)
4. `20251112230620_f47fc457-d5c1-421a-be2e-cf00b8651f23.sql` - (Check contents if any)
5. `20251122140412_9027bec6-c1e2-441b-a407-10d81f4cfe0d.sql` - (Check contents if any)
6. `20251202160059_fix_votes_rls_policy.sql` - Fix votes viewing
7. `20251207161229_fix_votes_insert_policy.sql` - Fix guest voting (IMPORTANT!)

3. For each migration:
   - Click **New Query**
   - Paste the SQL from the migration file
   - Click **Run** (or press Ctrl/Cmd + Enter)
   - Wait for "Success. No rows returned" message

### Option B: Using Supabase CLI

1. Install Supabase CLI (if not already installed):
   ```bash
   npm install -g supabase
   ```

2. Login to Supabase:
   ```bash
   npm run supa login
   ```
   (This will open a browser window to authenticate)

3. Link your project:
   ```bash
   npm run supa link --project-ref YOUR_PROJECT_REF
   ```
   - To find your Project Ref: Go to Settings → General → Reference ID

4. Push all migrations:
   ```bash
   npm run supa db push
   ```

## Step 5: Verify Database Setup

1. In Supabase Dashboard, go to **Table Editor**
2. You should see these tables:
   - ✅ `profiles`
   - ✅ `guest_identities`
   - ✅ `tags`
   - ✅ `polls`
   - ✅ `poll_options`
   - ✅ `votes`
   - ✅ `comments`
   - ✅ `media_assets`
   - ✅ `poll_tags`
   - ✅ `follows`

3. Go to **Authentication** → **Policies**
4. Verify that Row Level Security (RLS) is enabled on all tables
5. Check that policies exist for:
   - `votes` table should have policies for INSERT, UPDATE, DELETE
   - `guest_identities` table should allow anonymous inserts

## Step 6: Set Up Storage Bucket

1. In Supabase Dashboard, go to **Storage**
2. Click **"New bucket"**
3. Create a bucket with:
   - **Name**: `poll-media`
   - **Public bucket**: ✅ Check this box
4. Click **"Create bucket"**
5. The storage policies should already be set by the migrations, but verify:
   - Go to **Storage** → `poll-media` → **Policies**
   - Should see policies for public read access

## Step 7: Enable Authentication Providers (Optional - For Google Sign-In)

1. Go to **Authentication** → **Providers**
2. Enable any providers you want:
   - **Email**: Should be enabled by default
   - **Google**: 
     - Click **Google** provider
     - Toggle **Enable Google provider**
     - Add your Google OAuth credentials (if you have them)
     - Set Redirect URL to: `https://your-project-id.supabase.co/auth/v1/callback`

⚠️ **Note**: Google OAuth requires setup in Google Cloud Console. You can skip this for now and add it later.

## Step 8: Test the Connection

1. In your terminal, make sure you're in the project directory:
   ```bash
   cd /Users/carliebosier/Downloads/say-it-quick-main
   ```

2. Install dependencies (if not already done):
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser to the URL shown (usually `http://localhost:5173`)

5. Check the browser console (F12 → Console tab) for any errors

6. You should see the app load without Supabase configuration errors

## Step 9: Create Your First Test Account

1. Click **Sign In** in the app
2. Click the **Sign Up** tab
3. Create a test account with:
   - Username (optional)
   - Email
   - Password (at least 6 characters)
4. You should be automatically logged in

5. Verify in Supabase Dashboard:
   - Go to **Authentication** → **Users**
   - You should see your new user
   - Go to **Table Editor** → `profiles`
   - You should see a profile record for your user

## Step 10: Test Guest Voting (Critical!)

1. **Log out** of the app
2. Try to **vote** on a poll (or create one first if needed)
3. Check the browser console for errors
4. The vote should work without requiring authentication

If guest voting doesn't work:
- Verify migration `20251207161229_fix_votes_insert_policy.sql` was applied
- Check **Authentication** → **Policies** → `votes` table
- Look for detailed error messages in the browser console

## Troubleshooting

### "Missing Supabase configuration" error
- Make sure `.env` file exists in the project root
- Verify the file has no typos in variable names
- Restart your dev server after creating/modifying `.env`

### "Row Level Security policy violation" errors
- Make sure all migrations were applied in order
- Check that RLS policies exist in Supabase Dashboard
- Verify the `20251207161229_fix_votes_insert_policy.sql` migration was applied

### Can't see tables after running migrations
- Refresh the Supabase Dashboard
- Check SQL Editor for any error messages
- Verify you're looking at the correct project

### Guest voting still doesn't work
- Open browser console (F12)
- Look for detailed error messages (we've added comprehensive logging)
- Verify the votes INSERT policy allows `anon` role
- Check that `guest_identities` table allows anonymous inserts

## Next Steps

Once everything is working:
1. ✅ Test creating a poll
2. ✅ Test voting as an authenticated user
3. ✅ Test voting as a guest (logged out)
4. ✅ Test voting on polls you didn't create
5. ✅ Test comments functionality
6. ✅ Test the share button

## Need Help?

If you encounter issues:
1. Check the browser console for detailed error messages
2. Check Supabase Dashboard → Logs for server-side errors
3. Verify all migrations were applied successfully
4. Ensure your `.env` file has the correct credentials

