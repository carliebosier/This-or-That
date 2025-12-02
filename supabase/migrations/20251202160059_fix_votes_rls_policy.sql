-- Fix votes RLS policy to allow reading votes for public polls
-- This enables vote counts to display correctly for all users

-- Drop the restrictive policy that only allows users to view their own votes
DROP POLICY IF EXISTS "Users can view own votes" ON public.votes;

-- Allow reading votes for public polls (for vote counts)
-- Users can see vote counts but individual voter identities are somewhat protected
CREATE POLICY "Votes viewable for public polls" ON public.votes
FOR SELECT
USING (
  EXISTS (
    SELECT 1 
    FROM public.polls 
    WHERE polls.id = votes.poll_id 
    AND polls.is_public = true
  )
);

-- Keep the existing INSERT, UPDATE, DELETE policies as they are correct
-- They already allow users to insert/update/delete their own votes

