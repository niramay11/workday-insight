
-- 1. attendance_records
CREATE TABLE public.attendance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  punch_in timestamptz NOT NULL DEFAULT now(),
  punch_out timestamptz,
  total_hours numeric,
  status text NOT NULL DEFAULT 'active',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own attendance" ON public.attendance_records FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users insert own attendance" ON public.attendance_records FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own attendance" ON public.attendance_records FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Admins see all attendance" ON public.attendance_records FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update all attendance" ON public.attendance_records FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Managers see department attendance" ON public.attendance_records FOR SELECT USING (
  public.has_role(auth.uid(), 'manager') AND
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = attendance_records.user_id
    AND p.department_id = public.get_user_department(auth.uid())
  )
);

-- 2. screenshots
CREATE TABLE public.screenshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  attendance_id uuid NOT NULL REFERENCES public.attendance_records(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  captured_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL DEFAULT 'agent'
);

ALTER TABLE public.screenshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own screenshots" ON public.screenshots FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Admins see all screenshots" ON public.screenshots FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Managers see dept screenshots" ON public.screenshots FOR SELECT USING (
  public.has_role(auth.uid(), 'manager') AND
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = screenshots.user_id
    AND p.department_id = public.get_user_department(auth.uid())
  )
);

-- 3. idle_events
CREATE TABLE public.idle_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  attendance_id uuid NOT NULL REFERENCES public.attendance_records(id) ON DELETE CASCADE,
  idle_start timestamptz NOT NULL DEFAULT now(),
  idle_end timestamptz,
  duration_minutes numeric,
  source text NOT NULL DEFAULT 'agent'
);

ALTER TABLE public.idle_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own idle events" ON public.idle_events FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Admins see all idle events" ON public.idle_events FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Managers see dept idle events" ON public.idle_events FOR SELECT USING (
  public.has_role(auth.uid(), 'manager') AND
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = idle_events.user_id
    AND p.department_id = public.get_user_department(auth.uid())
  )
);

-- 4. activity_logs
CREATE TABLE public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  details jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own activity" ON public.activity_logs FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users insert own activity" ON public.activity_logs FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins see all activity" ON public.activity_logs FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- 5. app_settings
CREATE TABLE public.app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read settings" ON public.app_settings FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can update settings" ON public.app_settings FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert settings" ON public.app_settings FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed defaults
INSERT INTO public.app_settings (key, value) VALUES
  ('idle_threshold_minutes', '10'),
  ('expected_hours_per_day', '8'),
  ('agent_api_key', encode(gen_random_bytes(32), 'hex')),
  ('webhook_secret', encode(gen_random_bytes(32), 'hex'));

-- Storage bucket for screenshots
INSERT INTO storage.buckets (id, name, public) VALUES ('screenshots', 'screenshots', false);

-- Storage policies
CREATE POLICY "Admins can view all screenshots" ON storage.objects FOR SELECT USING (bucket_id = 'screenshots' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Service role can upload screenshots" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'screenshots');

-- Trigger for app_settings updated_at
CREATE TRIGGER update_app_settings_updated_at
  BEFORE UPDATE ON public.app_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for activity_logs
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_logs;
