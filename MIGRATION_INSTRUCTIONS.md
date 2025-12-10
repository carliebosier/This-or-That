# Migration Instructions - Fix Guest Voting RLS Policies

## Problem
Guest users and authenticated users voting on polls they didn't create were being blocked by Row Level Security (RLS) policies that didn't explicitly allow anonymous users.

## Solution
A new migration file has been created: `supabase/migrations/20251207161229_fix_votes_insert_policy.sql`

This migration:
1. Fixes the INSERT policy to explicitly allow both `authenticated` and `anon` roles
2. Fixes the UPDATE policy to allow anonymous users to update their guest votes
3. Fixes the DELETE policy to allow anonymous users to delete their guest votes
4. Ensures guest_identities table allows anonymous inserts and reads

## How to Apply the Migration

### Option 1: Using Supabase Dashboard (Recommended)
1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Navigate to **SQL Editor**
4. Copy the contents of `supabase/migrations/20251207161229_fix_votes_insert_policy.sql`
5. Paste into the SQL Editor
6. Click **Run** to execute the migration

### Option 2: Using Supabase CLI
1. Login to Supabase CLI:
   ```bash
   npm run supa login
   ```
2. Link your project (if not already linked):
   ```bash
   npm run supa link --project-ref zldoubmjcqmwirrghqio
   ```
3. Push migrations:
   ```bash
   npm run supa db push
   ```

## Verification

After applying the migration, test that:
1. **Guest voting works**: 
   - Log out of the app
   - Try to vote on a poll
   - Check the browser console for any errors
   - The vote should be recorded successfully

2. **Authenticated user voting on other's polls works**:
   - Log in as User A
   - Create a poll
   - Log in as User B (or use a different account)
   - Try to vote on User A's poll
   - The vote should be recorded successfully

3. **Check the browser console**:
   - Open Developer Tools (F12)
   - Go to the Console tab
   - Try voting as both guest and authenticated user
   - There should be no RLS policy errors

## Troubleshooting

If voting still doesn't work:

1. **Check the browser console** for detailed error messages (we've added comprehensive logging)

2. **Verify policies in Supabase Dashboard**:
   - Go to **Authentication** > **Policies**
   - Find the `votes` table
   - Verify these policies exist:
     - "Users can insert own votes" - should allow `authenticated, anon`
     - "Users can update own votes" - should allow `authenticated, anon`
     - "Users can delete own votes" - should allow `authenticated, anon`

3. **Check guest_identities policies**:
   - The `guest_identities` table should have:
     - "Anyone can create guest identity" - allows `authenticated, anon`
     - "Guest identities viewable for lookup" - allows `authenticated, anon`

4. **If you see RLS errors**, the migration may not have applied correctly. Re-run it manually through the SQL Editor.

## What Changed in the Code

1. **Enhanced error logging** in:
   - `src/pages/Home.tsx` - detailed vote error logging
   - `src/pages/PollDetail.tsx` - detailed vote error logging
   - `src/lib/guestIdentity.ts` - detailed guest identity creation error logging

2. **Migration file** created:
   - `supabase/migrations/20251207161229_fix_votes_insert_policy.sql`

The code changes ensure that:
- Detailed error information is logged to the console
- Error messages are shown to users
- Both authenticated and guest voting flows are properly handled


