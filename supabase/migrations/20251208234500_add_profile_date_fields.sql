-- Migration: Add profile date fields for reminders
-- Adds date_of_birth and work_anniversary fields to profiles table

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS date_of_birth date,
ADD COLUMN IF NOT EXISTS work_anniversary date;

COMMENT ON COLUMN public.profiles.date_of_birth IS 'Employee date of birth for birthday reminders';
COMMENT ON COLUMN public.profiles.work_anniversary IS 'Employee work start date for anniversary reminders';

-- Optional: Populate work_anniversary from existing joining_date if available
UPDATE public.profiles 
SET work_anniversary = joining_date 
WHERE joining_date IS NOT NULL AND work_anniversary IS NULL;
