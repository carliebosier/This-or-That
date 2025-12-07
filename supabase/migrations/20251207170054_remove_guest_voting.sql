-- Remove guest voting - require authentication for voting
-- This migration updates RLS policies to only allow authenticated users to vote

-- Drop existing votes INSERT policy that allowed anonymous users
DROP POLICY IF EXISTS "Users can insert own votes" ON public.votes;

-- Create new INSERT policy that only allows authenticated users
-- Users can only vote with their own user_id (no guest votes)
CREATE POLICY "Authenticated users can insert own votes" ON public.votes
FOR INSERT
TO authenticated
WITH CHECK (
  voter_user_id = auth.uid() AND voter_guest_id IS NULL
);

-- Drop existing UPDATE policy
DROP POLICY IF EXISTS "Users can update own votes" ON public.votes;

-- Create new UPDATE policy that only allows authenticated users
CREATE POLICY "Authenticated users can update own votes" ON public.votes
FOR UPDATE
TO authenticated
USING (
  voter_user_id = auth.uid() AND voter_guest_id IS NULL
)
WITH CHECK (
  voter_user_id = auth.uid() AND voter_guest_id IS NULL
);

-- Drop existing DELETE policy
DROP POLICY IF EXISTS "Users can delete own votes" ON public.votes;

-- Create new DELETE policy that only allows authenticated users
CREATE POLICY "Authenticated users can delete own votes" ON public.votes
FOR DELETE
TO authenticated
USING (
  voter_user_id = auth.uid() AND voter_guest_id IS NULL
);

-- Keep SELECT policy for viewing vote counts (read-only access for everyone)
-- The existing policy "Votes viewable for public polls" should remain
-- This allows everyone (including guests) to see vote counts, but not vote

-- Note: Guest identities table and related infrastructure remain in place
-- for potential future use, but voting is now restricted to authenticated users only

