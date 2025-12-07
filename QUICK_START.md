# Quick Start Guide - New Supabase Project

## 🚀 Fast Setup (5 minutes)

### Step 1: Create Supabase Project
1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Click **"New Project"**
3. Fill in name, password, region → Click **"Create new project"**
4. Wait 2-3 minutes for provisioning

### Step 2: Get Your Credentials
1. Go to **Settings** → **API**
2. Copy:
   - **Project URL** (the https:// url)
   - **anon public** key

### Step 3: Create .env File
1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and paste your credentials:
   ```env
   VITE_SUPABASE_URL=https://your-actual-project-id.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=your-actual-anon-key
   ```

### Step 4: Apply Migrations
1. In Supabase Dashboard, go to **SQL Editor**
2. Run these 7 migrations **in order** (copy/paste each file's contents):

   **Order:**
   ```
   1. supabase/migrations/20251109172320_335caa2d-9e2c-43d1-a948-d071f6f12d88.sql
   2. supabase/migrations/20251112230445_3db5d6cf-55ab-4aee-816e-4545ea9456b3.sql
   3. supabase/migrations/20251112230536_d6a6212b-ea1d-4e44-8925-0727ab49d0b9.sql
   4. supabase/migrations/20251112230620_f47fc457-d5c1-421a-be2e-cf00b8651f23.sql
   5. supabase/migrations/20251122140412_9027bec6-c1e2-441b-a407-10d81f4cfe0d.sql
   6. supabase/migrations/20251202160059_fix_votes_rls_policy.sql
   7. supabase/migrations/20251207161229_fix_votes_insert_policy.sql ⭐ CRITICAL
   ```

3. For each migration:
   - Click **"New Query"** in SQL Editor
   - Paste the SQL content
   - Click **"Run"**
   - Wait for "Success" message

### Step 5: Create Storage Bucket
1. Go to **Storage**
2. Click **"New bucket"**
3. Name: `poll-media`
4. ✅ Check **"Public bucket"**
5. Click **"Create bucket"**

### Step 6: Test It!
1. Start dev server:
   ```bash
   npm install
   npm run dev
   ```

2. Open browser → Check console for errors (F12)

3. Create a test account:
   - Click Sign In → Sign Up
   - Create account
   - Verify in Dashboard → Authentication → Users

4. **Test guest voting:**
   - Log out
   - Try to vote on a poll
   - Should work without errors!

## ✅ Verification Checklist

After setup, verify:
- [ ] Tables exist in **Table Editor** (profiles, polls, votes, etc.)
- [ ] Storage bucket `poll-media` exists
- [ ] Can create account and see profile in database
- [ ] Can create a poll
- [ ] **GUEST VOTING WORKS** (log out and vote)
- [ ] Can vote on polls you didn't create
- [ ] Comments work
- [ ] Share button works

## 📚 Need More Details?

See `SUPABASE_SETUP_GUIDE.md` for comprehensive instructions.

## 🐛 Troubleshooting

**"Missing Supabase configuration" error:**
- Make sure `.env` file exists and has correct values
- Restart dev server: `npm run dev`

**"RLS policy violation" errors:**
- Verify all 7 migrations ran successfully
- Check **Authentication** → **Policies** → `votes` table

**Guest voting doesn't work:**
- Check browser console for detailed errors
- Verify migration #7 (`20251207161229_fix_votes_insert_policy.sql`) was applied
- Check `votes` table policies allow `anon` role

