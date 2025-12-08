-- Migration: Allow authenticated users to view all profiles (for assignee display, comments, etc.)
-- This is needed because employees need to see other users' names and avatars

-- Drop the existing restrictive policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Create a new policy that allows all authenticated users to view all profiles
-- This is safe because profiles only contain non-sensitive info (name, avatar, department, etc.)
CREATE POLICY "Authenticated users can view all profiles"
  ON public.profiles FOR SELECT
  USING (auth.uid() IS NOT NULL);
