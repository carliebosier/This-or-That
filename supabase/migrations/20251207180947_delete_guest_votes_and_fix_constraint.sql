-- Fix unique_guest_vote constraint violation
-- The issue: unique_guest_vote uses NULLS NOT DISTINCT, which treats all NULLs as duplicates
-- When multiple authenticated users vote (all with voter_guest_id = NULL), they conflict

-- Step 1: Delete all guest votes since guest voting has been removed
DELETE FROM public.votes 
WHERE voter_guest_id IS NOT NULL;

-- Step 2: Drop the problematic constraint
ALTER TABLE public.votes 
DROP CONSTRAINT IF EXISTS unique_guest_vote;

-- Step 3: Create a partial unique index that only applies when voter_guest_id IS NOT NULL
-- This allows multiple authenticated votes (with NULL voter_guest_id) without conflicts
CREATE UNIQUE INDEX IF NOT EXISTS unique_guest_vote_non_null 
ON public.votes (poll_id, voter_guest_id) 
WHERE voter_guest_id IS NOT NULL;

-- Note: 
-- - unique_user_vote: (poll_id, voter_user_id) - ensures one vote per authenticated user per poll
-- - unique_guest_vote_non_null: Only applies when voter_guest_id IS NOT NULL (for safety, though we don't allow guest votes)
-- - Multiple authenticated votes on the same poll are now allowed (they all have voter_guest_id = NULL)

