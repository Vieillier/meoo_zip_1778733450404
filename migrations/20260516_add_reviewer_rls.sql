-- 2026-05-16: Add RLS policies to allow reviewer/admin full access to profiles and exhibitor_booths

-- Enable RLS on tables
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.exhibitor_booths ENABLE ROW LEVEL SECURITY;

-- Profiles: allow reviewers or the owner to SELECT
DROP POLICY IF EXISTS allow_profiles_select_reviewer ON public.profiles;
CREATE POLICY allow_profiles_select_reviewer ON public.profiles
  FOR SELECT
  USING (
    -- allow owner
    auth.uid() = id
    -- allow reviewer/admin users whose role is set in profiles
    OR EXISTS (
      SELECT 1 FROM public.profiles p2 WHERE p2.id = auth.uid() AND p2.role IN ('reviewer','admin')
    )
  );

-- Profiles: allow reviewers or the owner to INSERT
DROP POLICY IF EXISTS allow_profiles_insert_reviewer ON public.profiles;
CREATE POLICY allow_profiles_insert_reviewer ON public.profiles
  FOR INSERT
  WITH CHECK (
    -- allow creating own profile or allow reviewers/admins to insert any
    auth.uid() = id
    OR EXISTS (
      SELECT 1 FROM public.profiles p2 WHERE p2.id = auth.uid() AND p2.role IN ('reviewer','admin')
    )
  );

-- Profiles: allow reviewers or the owner to UPDATE
DROP POLICY IF EXISTS allow_profiles_update_reviewer ON public.profiles;
CREATE POLICY allow_profiles_update_reviewer ON public.profiles
  FOR UPDATE
  USING (
    auth.uid() = id
    OR EXISTS (
      SELECT 1 FROM public.profiles p2 WHERE p2.id = auth.uid() AND p2.role IN ('reviewer','admin')
    )
  )
  WITH CHECK (
    auth.uid() = id
    OR EXISTS (
      SELECT 1 FROM public.profiles p2 WHERE p2.id = auth.uid() AND p2.role IN ('reviewer','admin')
    )
  );

-- Exhibitor booths: allow reviewers to SELECT any, owners only their own
DROP POLICY IF EXISTS allow_booths_select_reviewer ON public.exhibitor_booths;
CREATE POLICY allow_booths_select_reviewer ON public.exhibitor_booths
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p2 WHERE p2.id = auth.uid() AND p2.role IN ('reviewer','admin')
    )
  );

-- Exhibitor booths: allow reviewers to INSERT
DROP POLICY IF EXISTS allow_booths_insert_reviewer ON public.exhibitor_booths;
CREATE POLICY allow_booths_insert_reviewer ON public.exhibitor_booths
  FOR INSERT
  WITH CHECK (
    -- allow insert if caller is reviewer/admin OR inserting a row for themselves
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p2 WHERE p2.id = auth.uid() AND p2.role IN ('reviewer','admin')
    )
  );

-- Exhibitor booths: allow reviewers to UPDATE
DROP POLICY IF EXISTS allow_booths_update_reviewer ON public.exhibitor_booths;
CREATE POLICY allow_booths_update_reviewer ON public.exhibitor_booths
  FOR UPDATE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p2 WHERE p2.id = auth.uid() AND p2.role IN ('reviewer','admin')
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p2 WHERE p2.id = auth.uid() AND p2.role IN ('reviewer','admin')
    )
  );

-- Optional: grant select/insert/update to authenticated role at SQL level (not a substitute for RLS)
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.exhibitor_booths TO authenticated;

-- Note: Run this migration as a DB superuser (service role) to apply RLS policies.
