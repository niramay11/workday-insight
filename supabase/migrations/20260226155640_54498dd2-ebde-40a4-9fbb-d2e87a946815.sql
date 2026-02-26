
-- Break types table
CREATE TABLE public.break_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  duration_minutes INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.break_types ENABLE ROW LEVEL SECURITY;

-- Break logs table
CREATE TABLE public.break_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  break_type_id UUID REFERENCES public.break_types(id) ON DELETE CASCADE NOT NULL,
  attendance_id UUID REFERENCES public.attendance_records(id) ON DELETE CASCADE NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.break_logs ENABLE ROW LEVEL SECURITY;

-- Add columns to existing tables
ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS current_task TEXT;
ALTER TABLE public.idle_events ADD COLUMN IF NOT EXISTS return_reason TEXT;

-- RLS for break_types
CREATE POLICY "Authenticated can view break types" ON public.break_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert break types" ON public.break_types FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update break types" ON public.break_types FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete break types" ON public.break_types FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS for break_logs
CREATE POLICY "Users see own break logs" ON public.break_logs FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users insert own break logs" ON public.break_logs FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own break logs" ON public.break_logs FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins see all break logs" ON public.break_logs FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow users to update their own idle events (for return_reason)
CREATE POLICY "Users update own idle events" ON public.idle_events FOR UPDATE TO authenticated USING (user_id = auth.uid());
