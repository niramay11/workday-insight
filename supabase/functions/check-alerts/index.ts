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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    // Get settings
    const { data: settings } = await supabase.from("app_settings").select("*");
    const settingsMap: Record<string, string> = {};
    (settings ?? []).forEach((s: any) => (settingsMap[s.key] = s.value));

    const idleThreshold = parseInt(settingsMap["idle_threshold_minutes"] ?? "10");
    const missedPunchTime = settingsMap["missed_punch_alert_time"] ?? "10:00";
    const [missedHour, missedMinute] = missedPunchTime.split(":").map(Number);

    // Check if current time is past the missed punch alert time
    const checkMissedPunch = now.getHours() >= missedHour && now.getMinutes() >= missedMinute;

    // Get all active profiles
    const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").eq("status", "active");
    const allUsers = profiles ?? [];

    // Get today's attendance
    const { data: todayAttendance } = await supabase
      .from("attendance_records")
      .select("user_id")
      .gte("punch_in", today.toISOString());

    const punchedInUsers = new Set((todayAttendance ?? []).map((a: any) => a.user_id));

    // Get open idle events exceeding threshold
    const { data: openIdles } = await supabase
      .from("idle_events")
      .select("user_id, idle_start")
      .is("idle_end", null);

    const notifications: any[] = [];

    // 1. Missed punch-in alerts
    if (checkMissedPunch) {
      for (const user of allUsers) {
        if (!punchedInUsers.has(user.user_id)) {
          // Check if we already sent this notification today
          const { data: existing } = await supabase
            .from("notifications")
            .select("id")
            .eq("user_id", user.user_id)
            .eq("type", "missed_punch")
            .gte("created_at", today.toISOString())
            .limit(1);

          if (!existing?.length) {
            notifications.push({
              user_id: user.user_id,
              title: "Missed Punch-In",
              message: `You haven't punched in today. Expected by ${missedPunchTime}.`,
              type: "missed_punch",
            });
          }
        }
      }
    }

    // 2. Idle alerts
    for (const idle of (openIdles ?? [])) {
      const idleMinutes = (now.getTime() - new Date(idle.idle_start).getTime()) / 60000;
      if (idleMinutes >= idleThreshold) {
        const { data: existing } = await supabase
          .from("notifications")
          .select("id")
          .eq("user_id", idle.user_id)
          .eq("type", "idle_alert")
          .gte("created_at", new Date(Date.now() - 30 * 60000).toISOString())
          .limit(1);

        if (!existing?.length) {
          notifications.push({
            user_id: idle.user_id,
            title: "Extended Idle Detected",
            message: `You've been idle for ${Math.round(idleMinutes)} minutes.`,
            type: "idle_alert",
          });
        }
      }
    }

    // Insert all notifications
    if (notifications.length > 0) {
      const { error } = await supabase.from("notifications").insert(notifications);
      if (error) throw error;
    }

    return new Response(
      JSON.stringify({ success: true, notificationsSent: notifications.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
