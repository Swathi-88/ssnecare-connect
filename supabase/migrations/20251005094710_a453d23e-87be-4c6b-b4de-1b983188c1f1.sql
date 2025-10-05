-- Drop the insecure policy that allows anyone to view all profiles
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Create a secure policy that only allows viewing profiles of:
-- 1. Your own profile
-- 2. Profiles of users you have active conversations with
CREATE POLICY "Users can view own profile and conversation participants"
ON public.profiles
FOR SELECT
USING (
  auth.uid() = id
  OR
  EXISTS (
    SELECT 1 FROM public.conversations
    WHERE (
      (conversations.buyer_id = auth.uid() AND conversations.seller_id = profiles.id)
      OR
      (conversations.seller_id = auth.uid() AND conversations.buyer_id = profiles.id)
    )
  )
);