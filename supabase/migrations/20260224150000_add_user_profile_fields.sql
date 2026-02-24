-- Add identity profile fields for all user types.
ALTER TABLE public.users
ADD COLUMN first_name TEXT,
ADD COLUMN last_name TEXT,
ADD COLUMN email_address TEXT,
ADD COLUMN mobile_number TEXT;

-- Prevent duplicate email addresses when provided.
CREATE UNIQUE INDEX IF NOT EXISTS users_email_address_unique
ON public.users (email_address)
WHERE email_address IS NOT NULL;
