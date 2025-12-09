-- Fix vote constraint issues
-- This migration ensures that authenticated votes explicitly set voter_guest_id to NULL
-- and cleans up any orphaned guest votes that might cause conflicts

-- First, delete any votes that have both voter_user_id and voter_guest_id set (invalid state)
-- This shouldn't happen due to the CHECK constraint, but let's be safe
DELETE FROM public.votes 
WHERE voter_user_id IS NOT NULL AND voter_guest_id IS NOT NULL;

-- Delete any votes with NULL voter_user_id and NULL voter_guest_id (invalid state)
DELETE FROM public.votes 
WHERE voter_user_id IS NULL AND voter_guest_id IS NULL;

-- Note: The unique constraints should work correctly now that we're explicitly
-- setting voter_guest_id to NULL in the application code for authenticated votes.
-- The unique_user_vote constraint ensures one vote per user per poll.
-- The unique_guest_vote constraint ensures one vote per guest per poll.
-- Since authenticated votes have voter_guest_id = NULL, they won't conflict with
-- guest votes (which have voter_user_id = NULL).


