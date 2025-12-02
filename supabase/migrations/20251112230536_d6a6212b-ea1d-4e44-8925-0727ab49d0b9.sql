-- Drop and recreate the view without security definer issues
DROP VIEW IF EXISTS public.poll_vote_counts;

-- Recreate as a regular view (not materialized, no security definer)
CREATE VIEW public.poll_vote_counts 
WITH (security_invoker=true)
AS
SELECT 
  poll_id,
  option_id,
  COUNT(*) as vote_count
FROM public.votes
GROUP BY poll_id, option_id;

-- Grant access to the view
GRANT SELECT ON public.poll_vote_counts TO authenticated, anon;