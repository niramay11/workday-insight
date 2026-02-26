
-- Make break_types columns nullable (they become just labels now)
ALTER TABLE public.break_types
  ALTER COLUMN start_time DROP NOT NULL,
  ALTER COLUMN end_time DROP NOT NULL,
  ALTER COLUMN duration_minutes DROP NOT NULL;

-- Add custom_reason to break_logs and make break_type_id nullable
ALTER TABLE public.break_logs
  ADD COLUMN custom_reason TEXT,
  ALTER COLUMN break_type_id DROP NOT NULL;

-- Drop the FK constraint temporarily and re-add allowing NULL
ALTER TABLE public.break_logs DROP CONSTRAINT IF EXISTS break_logs_break_type_id_fkey;
ALTER TABLE public.break_logs ADD CONSTRAINT break_logs_break_type_id_fkey
  FOREIGN KEY (break_type_id) REFERENCES public.break_types(id) ON DELETE CASCADE;

-- Insert daily break allowance setting (default 75 minutes = 1h 15m)
INSERT INTO public.app_settings (key, value)
VALUES ('daily_break_allowance_minutes', '75')
ON CONFLICT DO NOTHING;
