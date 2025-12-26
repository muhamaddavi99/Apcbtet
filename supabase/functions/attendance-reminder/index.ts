import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting attendance reminder check...");
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get school settings for cutoff time
    const { data: settings } = await supabase
      .from("school_settings")
      .select("late_time, school_name")
      .limit(1)
      .maybeSingle();

    const lateTime = settings?.late_time || "07:30:00";
    const schoolName = settings?.school_name || "Sekolah";
    
    // Get current time in WIB (UTC+7)
    const now = new Date();
    const wibOffset = 7 * 60; // WIB is UTC+7
    const wibTime = new Date(now.getTime() + (wibOffset + now.getTimezoneOffset()) * 60000);
    const currentTimeStr = wibTime.toTimeString().slice(0, 5);
    const today = wibTime.toISOString().split("T")[0];

    // Check if current time is close to late time (5-15 minutes before)
    const [lateHour, lateMinute] = lateTime.split(":").map(Number);
    const lateTimeMinutes = lateHour * 60 + lateMinute;
    const [currentHour, currentMinute] = currentTimeStr.split(":").map(Number);
    const currentTimeMinutes = currentHour * 60 + currentMinute;
    
    const minutesBefore = lateTimeMinutes - currentTimeMinutes;
    console.log(`Current time: ${currentTimeStr}, Late time: ${lateTime}, Minutes before: ${minutesBefore}`);

    // Only send reminders 5-15 minutes before late time
    if (minutesBefore < 5 || minutesBefore > 15) {
      console.log("Not in reminder window, skipping...");
      return new Response(
        JSON.stringify({ 
          message: "Not in reminder window", 
          currentTime: currentTimeStr,
          lateTime,
          minutesBefore 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if today is a holiday or Friday
    const dayOfWeek = wibTime.getDay();
    if (dayOfWeek === 5) { // Friday
      console.log("Today is Friday (holiday), skipping...");
      return new Response(
        JSON.stringify({ message: "Today is Friday (holiday)" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: holiday } = await supabase
      .from("holidays")
      .select("*")
      .eq("date", today)
      .maybeSingle();

    if (holiday) {
      console.log(`Today is a holiday: ${holiday.name}, skipping...`);
      return new Response(
        JSON.stringify({ message: `Today is a holiday: ${holiday.name}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get all teachers who haven't checked in today
    const { data: allTeachers } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("role", ["teacher", "staff"]);

    const { data: attendedToday } = await supabase
      .from("attendance")
      .select("user_id")
      .eq("date", today);

    const attendedUserIds = new Set((attendedToday || []).map((a) => a.user_id));
    const notAttendedTeachers = (allTeachers || []).filter(
      (t) => !attendedUserIds.has(t.id)
    );

    console.log(`Found ${notAttendedTeachers.length} teachers who haven't checked in`);

    if (notAttendedTeachers.length === 0) {
      return new Response(
        JSON.stringify({ message: "All teachers have checked in" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get push subscriptions for these teachers
    const teacherIds = notAttendedTeachers.map((t) => t.id);
    const { data: subscriptions } = await supabase
      .from("push_subscriptions")
      .select("*")
      .in("user_id", teacherIds);

    if (!subscriptions || subscriptions.length === 0) {
      console.log("No push subscriptions found for these teachers");
      return new Response(
        JSON.stringify({ 
          message: "No push subscriptions found",
          teachersNotAttended: notAttendedTeachers.length 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send push notifications
    const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY");
    const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY");

    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      throw new Error("VAPID keys not configured");
    }

    const notification = {
      title: `⏰ Pengingat Absensi - ${schoolName}`,
      body: `Jangan lupa absen! Batas waktu: ${lateTime.slice(0, 5)}. Anda belum melakukan absensi hari ini.`,
      tag: "attendance-reminder",
      url: "/absensi",
    };

    let sent = 0;
    let failed = 0;

    for (const sub of subscriptions) {
      try {
        // Call send-push-notification function
        const { error } = await supabase.functions.invoke("send-push-notification", {
          body: {
            notification,
            user_ids: [sub.user_id],
          },
        });

        if (error) {
          console.error(`Failed to send to ${sub.user_id}:`, error);
          failed++;
        } else {
          sent++;
        }
      } catch (err) {
        console.error(`Error sending to ${sub.user_id}:`, err);
        failed++;
      }
    }

    console.log(`Sent ${sent} reminders, ${failed} failed`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent, 
        failed,
        teachersNotAttended: notAttendedTeachers.length,
        subscriptionsFound: subscriptions.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Attendance reminder error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
