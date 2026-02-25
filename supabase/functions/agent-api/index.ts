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

    // Find active attendance record
    const { data: activeRecord } = await supabase
      .from("attendance_records")
      .select("id")
      .eq("user_id", user_id)
      .eq("status", "active")
      .maybeSingle();

    if (!activeRecord && action !== "punch_in") {
      return new Response(JSON.stringify({ error: "No active attendance session" }), {
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

    if (action === "screenshot" && activeRecord) {
      // Decode base64 and upload to storage
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
    } else if (action === "idle_start" && activeRecord) {
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
      // Find latest open idle event
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
