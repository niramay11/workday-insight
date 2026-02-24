import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const webhookSecret = req.headers.get("x-webhook-secret");
    if (!webhookSecret) {
      return new Response(JSON.stringify({ error: "Missing webhook secret" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Validate webhook secret
    const { data: setting } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "webhook_secret")
      .single();

    if (!setting || setting.value !== webhookSecret) {
      return new Response(JSON.stringify({ error: "Invalid webhook secret" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { event_type, user_email, user_id: external_user_id, data: payload } = body;

    // Resolve user by email or direct user_id
    let userId: string | null = null;
    if (user_email) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("email", user_email)
        .maybeSingle();
      userId = profile?.user_id ?? null;
    } else if (external_user_id) {
      userId = external_user_id;
    }

    if (!userId) {
      return new Response(JSON.stringify({ error: "Could not resolve user" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find active attendance record
    const { data: activeRecord } = await supabase
      .from("attendance_records")
      .select("id")
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();

    let result: any = null;

    if (event_type === "screenshot" && activeRecord) {
      const { data: screenshot, error } = await supabase
        .from("screenshots")
        .insert({
          user_id: userId,
          attendance_id: activeRecord.id,
          image_url: payload?.screenshot_url ?? "",
          source: "webhook",
        })
        .select()
        .single();
      if (error) throw error;
      result = screenshot;
    } else if (event_type === "idle_start" && activeRecord) {
      const { data: idle, error } = await supabase
        .from("idle_events")
        .insert({
          user_id: userId,
          attendance_id: activeRecord.id,
          source: "webhook",
        })
        .select()
        .single();
      if (error) throw error;
      result = idle;
    } else if (event_type === "idle_end") {
      const { data: openIdle } = await supabase
        .from("idle_events")
        .select("*")
        .eq("user_id", userId)
        .is("idle_end", null)
        .order("idle_start", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (openIdle) {
        const durationMin = (Date.now() - new Date(openIdle.idle_start).getTime()) / 60000;
        const { data: updated, error } = await supabase
          .from("idle_events")
          .update({
            idle_end: new Date().toISOString(),
            duration_minutes: Math.round(durationMin * 100) / 100,
          })
          .eq("id", openIdle.id)
          .select()
          .single();
        if (error) throw error;
        result = updated;
      }
    }

    // Log activity
    await supabase.from("activity_logs").insert({
      user_id: userId,
      action: event_type,
      details: { source: "webhook", ...(payload ?? {}) },
    });

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
