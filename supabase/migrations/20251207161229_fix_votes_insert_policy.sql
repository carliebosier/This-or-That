-- Fix votes INSERT policy to explicitly allow anonymous users (guests)
-- This enables guest voting which was previously blocked

-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Users can insert own votes" ON public.votes;

-- Create a new policy that explicitly allows both authenticated and anonymous users
-- The policy ensures that:
-- 1. Authenticated users can only vote with their own user_id
-- 2. Anonymous users can vote with a guest_id (but not with any user_id)
CREATE POLICY "Users can insert own votes" ON public.votes
FOR INSERT
TO authenticated, anon
WITH CHECK (
  (voter_user_id = auth.uid() AND voter_guest_id IS NULL) OR
  (voter_user_id IS NULL AND voter_guest_id IS NOT NULL)
);

-- Also ensure the UPDATE policy allows anonymous users to update their guest votes
DROP POLICY IF EXISTS "Users can update own votes" ON public.votes;

CREATE POLICY "Users can update own votes" ON public.votes
FOR UPDATE
TO authenticated, anon
USING (
  (voter_user_id = auth.uid() AND voter_guest_id IS NULL) OR
  (voter_user_id IS NULL AND voter_guest_id IS NOT NULL)
)
WITH CHECK (
  (voter_user_id = auth.uid() AND voter_guest_id IS NULL) OR
  (voter_user_id IS NULL AND voter_guest_id IS NOT NULL)
);

-- Ensure DELETE policy also allows anonymous users
DROP POLICY IF EXISTS "Users can delete own votes" ON public.votes;

CREATE POLICY "Users can delete own votes" ON public.votes
FOR DELETE
TO authenticated, anon
USING (
  (voter_user_id = auth.uid() AND voter_guest_id IS NULL) OR
  (voter_user_id IS NULL AND voter_guest_id IS NOT NULL)
);

-- Verify guest_identities table allows anonymous inserts
-- Drop and recreate to ensure it's correct
DROP POLICY IF EXISTS "Anyone can create guest identity" ON public.guest_identities;

CREATE POLICY "Anyone can create guest identity" ON public.guest_identities
FOR INSERT
TO authenticated, anon
WITH CHECK (true);

-- Ensure anonymous users can read their own guest identity (needed for checking if it exists)
DROP POLICY IF EXISTS "Guest identities viewable by creator" ON public.guest_identities;

-- Allow reading guest identities - needed for the get_or_create_guest_identity function
CREATE POLICY "Guest identities viewable for lookup" ON public.guest_identities
FOR SELECT
TO authenticated, anon
USING (true);

