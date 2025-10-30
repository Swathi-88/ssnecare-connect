-- Create a public_profiles view that only exposes non-sensitive profile information
-- This prevents conversation participants from accessing email and phone numbers

CREATE OR REPLACE VIEW public.public_profiles AS
SELECT 
  id,
  full_name,
  avatar_url,
  created_at,
  updated_at
FROM public.profiles;

-- Grant access to the view for authenticated users
GRANT SELECT ON public.public_profiles TO authenticated;

-- Drop the existing overly permissive policy on profiles
DROP POLICY IF EXISTS "Users can view own profile and conversation participants" ON public.profiles;

-- Create a strict policy: users can only view their own complete profile
CREATE POLICY "Users can view own complete profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

-- The existing INSERT and UPDATE policies remain unchanged as they're already secure
-- Users can insert own profile: USING (auth.uid() = id)
-- Users can update own profile: USING (auth.uid() = id)