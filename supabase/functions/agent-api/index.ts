import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Missing API key" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = authHeader.replace("Bearer ", "");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Validate API key
    const { data: setting } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "agent_api_key")
      .single();

    if (!setting || setting.value !== apiKey) {
      return new Response(JSON.stringify({ error: "Invalid API key" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action, user_id, data: payload } = body;

    if (!action || !user_id) {
      return new Response(JSON.stringify({ error: "Missing action or user_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Upsert heartbeat on every request
    await supabase.from("agent_heartbeats").upsert(
      {
        user_id,
        last_seen_at: new Date().toISOString(),
        agent_version: payload?.agent_version ?? null,
        hostname: payload?.hostname ?? null,
      },
      { onConflict: "user_id" }
    );

    let result: any = null;

    // ─── GET_BREAK_TYPES ───
    if (action === "get_break_types") {
      const { data: breakTypes, error } = await supabase
        .from("break_types")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      result = breakTypes;

      return new Response(JSON.stringify({ success: true, data: result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── GET_CONFIG ───
    if (action === "get_config") {
      const { data: settings, error } = await supabase
        .from("app_settings")
        .select("key, value")
        .in("key", ["daily_break_allowance_minutes", "idle_threshold_seconds", "screenshot_interval_seconds"]);
      if (error) throw error;

      const config: Record<string, string> = {};
      for (const s of settings ?? []) {
        config[s.key] = s.value;
      }
      result = config;

      return new Response(JSON.stringify({ success: true, data: result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── PUNCH_IN ───
    if (action === "punch_in") {
      // Check if there's already an active session
      const { data: existing } = await supabase
        .from("attendance_records")
        .select("id")
        .eq("user_id", user_id)
        .eq("status", "active")
        .maybeSingle();

      if (existing) {
        result = existing;
      } else {
        const { data: record, error } = await supabase
          .from("attendance_records")
          .insert({
            user_id,
            punch_in: new Date().toISOString(),
            status: "active",
            current_task: payload?.current_task ?? null,
          })
          .select()
          .single();
        if (error) throw error;
        result = record;
      }

      // Log activity
      await supabase.from("activity_logs").insert({
        user_id,
        action: "punch_in",
        details: { source: "agent", ...(payload ?? {}) },
      });

      return new Response(JSON.stringify({ success: true, data: result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── PUNCH_OUT ───
    if (action === "punch_out") {
      const { data: activeRecord } = await supabase
        .from("attendance_records")
        .select("id, punch_in")
        .eq("user_id", user_id)
        .eq("status", "active")
        .maybeSingle();

      if (activeRecord) {
        const punchIn = new Date(activeRecord.punch_in);
        const now = new Date();
        const totalHours = Math.round(((now.getTime() - punchIn.getTime()) / 3600000) * 100) / 100;

        const { data: updated, error } = await supabase
          .from("attendance_records")
          .update({
            punch_out: now.toISOString(),
            total_hours: totalHours,
            status: "completed",
          })
          .eq("id", activeRecord.id)
          .select()
          .single();
        if (error) throw error;
        result = updated;
      }

      // Log activity
      await supabase.from("activity_logs").insert({
        user_id,
        action: "punch_out",
        details: { source: "agent", ...(payload ?? {}) },
      });

      return new Response(JSON.stringify({ success: true, data: result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── LOG_BREAK ───
    if (action === "log_break") {
      // Find the most recent completed attendance (the one that was just punched out)
      const { data: lastRecord } = await supabase
        .from("attendance_records")
        .select("id")
        .eq("user_id", user_id)
        .order("punch_out", { ascending: false })
        .limit(1)
        .maybeSingle();

      // Or active record if still active
      const { data: activeRecord } = await supabase
        .from("attendance_records")
        .select("id")
        .eq("user_id", user_id)
        .eq("status", "active")
        .maybeSingle();

      const attendanceId = activeRecord?.id ?? lastRecord?.id;
      if (!attendanceId) {
        return new Response(JSON.stringify({ error: "No attendance record found" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const durationMinutes = payload?.duration_minutes ?? 0;
      const endedAt = new Date();
      const startedAt = new Date(endedAt.getTime() - durationMinutes * 60000);

      const { data: breakLog, error } = await supabase
        .from("break_logs")
        .insert({
          user_id,
          attendance_id: attendanceId,
          break_type_id: payload?.break_type_id ?? null,
          custom_reason: payload?.custom_reason ?? null,
          started_at: startedAt.toISOString(),
          ended_at: endedAt.toISOString(),
          status: "completed",
        })
        .select()
        .single();
      if (error) throw error;
      result = breakLog;

      // Log activity
      await supabase.from("activity_logs").insert({
        user_id,
        action: "log_break",
        details: { source: "agent", ...(payload ?? {}) },
      });

      return new Response(JSON.stringify({ success: true, data: result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── CHECK_STATUS (for UI app to check if punched in) ───
    if (action === "check_status") {
      const { data: activeRecord } = await supabase
        .from("attendance_records")
        .select("id, punch_in, current_task")
        .eq("user_id", user_id)
        .eq("status", "active")
        .maybeSingle();

      result = { punched_in: !!activeRecord, record: activeRecord };

      return new Response(JSON.stringify({ success: true, data: result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── EXISTING ACTIONS (require active attendance) ───
    const { data: activeRecord } = await supabase
      .from("attendance_records")
      .select("id")
      .eq("user_id", user_id)
      .eq("status", "active")
      .maybeSingle();

    if (!activeRecord) {
      return new Response(JSON.stringify({ error: "No active attendance session" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "screenshot") {
      const imageData = Uint8Array.from(atob(payload.image_base64), (c) => c.charCodeAt(0));
      const fileName = `${user_id}/${Date.now()}.png`;

      await supabase.storage.from("screenshots").upload(fileName, imageData, {
        contentType: "image/png",
      });

      const { data: urlData } = supabase.storage.from("screenshots").getPublicUrl(fileName);

      const { data: screenshot, error } = await supabase
        .from("screenshots")
        .insert({
          user_id,
          attendance_id: activeRecord.id,
          image_url: urlData.publicUrl,
          source: "agent",
        })
        .select()
        .single();
      if (error) throw error;
      result = screenshot;
    } else if (action === "idle_start") {
      const { data: idle, error } = await supabase
        .from("idle_events")
        .insert({
          user_id,
          attendance_id: activeRecord.id,
          source: "agent",
        })
        .select()
        .single();
      if (error) throw error;
      result = idle;
    } else if (action === "idle_end") {
      const { data: openIdle } = await supabase
        .from("idle_events")
        .select("*")
        .eq("user_id", user_id)
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
      user_id,
      action,
      details: { source: "agent", ...(payload ?? {}) },
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
