-- Fix guest_identities security issue
-- Remove overly permissive SELECT policy
DROP POLICY IF EXISTS "Guest identities viewable by creator" ON public.guest_identities;

-- Create a secure function to get or create guest identity by fingerprint
CREATE OR REPLACE FUNCTION public.get_or_create_guest_identity(fingerprint_hash_input text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  guest_id uuid;
BEGIN
  -- Try to find existing guest identity
  SELECT id INTO guest_id
  FROM guest_identities
  WHERE fingerprint_hash = fingerprint_hash_input;
  
  -- If not found, create new one
  IF guest_id IS NULL THEN
    INSERT INTO guest_identities (fingerprint_hash)
    VALUES (fingerprint_hash_input)
    RETURNING id INTO guest_id;
  END IF;
  
  RETURN guest_id;
END;
$$;

-- Fix votes security issue - remove public access to individual votes
DROP POLICY IF EXISTS "Votes viewable by everyone" ON public.votes;

-- Allow authenticated users to view only their own votes
CREATE POLICY "Users can view own votes" ON public.votes
FOR SELECT TO authenticated
USING (voter_user_id = auth.uid());

-- Create a secure function for checking user's vote on a poll
CREATE OR REPLACE FUNCTION public.get_user_vote(poll_id_input uuid, guest_id_input uuid DEFAULT NULL)
RETURNS TABLE (vote_id uuid, option_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    -- Authenticated user
    RETURN QUERY
    SELECT id, option_id
    FROM votes
    WHERE poll_id = poll_id_input AND voter_user_id = auth.uid();
  ELSIF guest_id_input IS NOT NULL THEN
    -- Guest user
    RETURN QUERY
    SELECT id, option_id
    FROM votes
    WHERE poll_id = poll_id_input AND voter_guest_id = guest_id_input;
  END IF;
END;
$$;

-- Create a public view for aggregate vote counts (doesn't expose voter identities)
CREATE OR REPLACE VIEW public.poll_vote_counts AS
SELECT 
  poll_id,
  option_id,
  COUNT(*) as vote_count
FROM public.votes
GROUP BY poll_id, option_id;

-- Grant access to the view
GRANT SELECT ON public.poll_vote_counts TO authenticated, anon;