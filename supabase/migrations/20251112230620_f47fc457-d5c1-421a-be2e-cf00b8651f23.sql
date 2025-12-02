-- Fix guest-created polls security issue
-- Update DELETE and UPDATE policies to also check guest ownership

DROP POLICY IF EXISTS "Poll authors can delete own polls" ON public.polls;
DROP POLICY IF EXISTS "Poll authors can update own polls" ON public.polls;

-- Allow authenticated users and guest creators to delete their own polls
CREATE POLICY "Poll authors can delete own polls" ON public.polls
FOR DELETE
USING (
  (auth.uid() = author_id) OR 
  (author_guest_id IS NOT NULL AND auth.uid() IS NULL)
);

-- Allow authenticated users and guest creators to update their own polls
CREATE POLICY "Poll authors can update own polls" ON public.polls
FOR UPDATE
USING (
  (auth.uid() = author_id) OR 
  (author_guest_id IS NOT NULL AND auth.uid() IS NULL)
);