
-- Create agent_heartbeats table
CREATE TABLE public.agent_heartbeats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  agent_version TEXT,
  hostname TEXT
);

-- Enable RLS
ALTER TABLE public.agent_heartbeats ENABLE ROW LEVEL SECURITY;

-- Users can see their own heartbeat
CREATE POLICY "Users can view own heartbeat"
ON public.agent_heartbeats
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Admins can see all heartbeats
CREATE POLICY "Admins can view all heartbeats"
ON public.agent_heartbeats
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Managers can see department heartbeats
CREATE POLICY "Managers can view dept heartbeats"
ON public.agent_heartbeats
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'manager')
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = agent_heartbeats.user_id
    AND p.department_id = public.get_user_department(auth.uid())
  )
);
