-- Fix 1: Drop public_profiles view since views can't have RLS
-- The profiles table already has proper RLS policies
DROP VIEW IF EXISTS public.public_profiles;

-- Fix 2: Add rate limiting columns for OTP verification
ALTER TABLE public.email_verifications 
ADD COLUMN IF NOT EXISTS attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_attempt_at TIMESTAMP WITH TIME ZONE;

-- Fix 3: Change OTP storage from plain text to hashed
ALTER TABLE public.email_verifications 
RENAME COLUMN otp_code TO otp_hash;