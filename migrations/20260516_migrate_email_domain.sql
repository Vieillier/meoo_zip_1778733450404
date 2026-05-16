-- 2026-05-16: Migrate auth emails from @review.local to @test.com
-- This ensures consistency between new auth registration and existing account email formats

-- Update all auth.users emails from @review.local to @test.com
UPDATE auth.users 
SET email = REPLACE(email, '@review.local', '@test.com')
WHERE email LIKE '%@review.local';

-- Update profiles usernames to match email prefixes (strip domain)
UPDATE public.profiles
SET username = split_part(
  COALESCE(
    (SELECT email FROM auth.users WHERE auth.users.id = profiles.id),
    profiles.username
  ),
  '@',
  1
)
WHERE username NOT LIKE '%@%';

-- Note: Run this migration as a DB superuser (service role).
-- After running, existing users with @review.local emails will be updated to @test.com
-- and can log in using the new email format.
