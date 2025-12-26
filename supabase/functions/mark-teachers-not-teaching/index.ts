import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// WIB helpers
const WIB_TZ = 'Asia/Jakarta';

function getWibNow(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: WIB_TZ }));
}

function getWibDateStr(): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: WIB_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const map: Record<string, string> = {};
  for (const p of parts) map[p.type] = p.value;
  return `${map.year}-${map.month}-${map.day}`;
}

function getWibTimeStr(): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: WIB_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date());
  const map: Record<string, string> = {};
  for (const p of parts) map[p.type] = p.value;
  return `${map.hour}:${map.minute}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const todayStr = getWibDateStr();
    const currentTime = getWibTimeStr();
    const wibNow = getWibNow();
    const dayOfWeek = wibNow.getDay();
    const dayNames = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    const currentDay = dayNames[dayOfWeek];

    console.log(`Checking teachers for ${currentDay}, ${todayStr} at ${currentTime} WIB`);

    // Skip Friday (5) - school holiday
    if (dayOfWeek === 5) {
      console.log("Friday (Jumat), skipping check - school holiday");
      return new Response(
        JSON.stringify({ message: "Friday (Jumat), skipping - school holiday" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if today is a holiday from database
    const { data: holiday } = await supabase
      .from("holidays")
      .select("id, name")
      .eq("date", todayStr)
      .maybeSingle();

    if (holiday) {
      console.log(`Today is a holiday (${holiday.name}), skipping check`);
      return new Response(
        JSON.stringify({ message: `Today is a holiday (${holiday.name}), skipping` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get school settings for check_out_time
    const { data: schoolSettings } = await supabase
      .from("school_settings")
      .select("check_out_time")
      .limit(1)
      .maybeSingle();

    const checkOutTime = schoolSettings?.check_out_time?.slice(0, 5) || "14:00";

    console.log(`Current WIB time: ${currentTime}, Check out time: ${checkOutTime}`);

    // Only run if current time is past check_out_time
    if (currentTime < checkOutTime) {
      console.log(`Not yet past check_out_time (${checkOutTime}), skipping`);
      return new Response(
        JSON.stringify({
          message: `Not yet past check_out_time (${checkOutTime}), current time: ${currentTime}`,
          skipped: true,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Preload approved leave set for today
    const { data: approvedLeaves } = await supabase
      .from('teacher_leave_requests')
      .select('teacher_id')
      .eq('status', 'approved')
      .lte('start_date', todayStr)
      .gte('end_date', todayStr);

    const leaveSet = new Set<string>((approvedLeaves || []).map((r: any) => r.teacher_id));

    // Get all schedules for today
    const { data: schedules, error: schedError } = await supabase
      .from("schedules")
      .select("id, teacher_id, class_id, subject_id, start_time, end_time")
      .eq("day", currentDay);

    if (schedError) throw schedError;

    console.log(`Found ${schedules?.length || 0} schedules for today`);

    let markedCount = 0;

    for (const schedule of schedules || []) {
      // Skip teacher on approved leave
      if (leaveSet.has(schedule.teacher_id)) {
        console.log(`Teacher ${schedule.teacher_id} is on approved leave, skipping`);
        continue;
      }

      // Check if schedule time has passed (compare with current WIB time)
      if (schedule.end_time <= currentTime) {
        // Check if teaching session exists for this schedule today
        const { data: session } = await supabase
          .from("teaching_sessions")
          .select("id")
          .eq("schedule_id", schedule.id)
          .gte("created_at", `${todayStr}T00:00:00`)
          .lte("created_at", `${todayStr}T23:59:59`)
          .maybeSingle();

        if (!session) {
          // Check if already marked for this schedule today
          const { data: existingRecord } = await supabase
            .from("teacher_no_teach_records")
            .select("id")
            .eq("schedule_id", schedule.id)
            .eq("date", todayStr)
            .maybeSingle();

          if (!existingRecord) {
            // No teaching session found, mark as not teaching
            const { error: insertError } = await supabase
              .from("teacher_no_teach_records")
              .insert({
                teacher_id: schedule.teacher_id,
                schedule_id: schedule.id,
                date: todayStr,
                class_id: schedule.class_id,
                subject_id: schedule.subject_id,
                reason: "Tidak memulai sesi mengajar",
              });

            if (insertError) {
              console.error("Error inserting no-teach record:", insertError);
            } else {
              markedCount++;
              console.log(`Marked teacher ${schedule.teacher_id} as not teaching for schedule ${schedule.id}`);
            }
          }
        }
      }
    }

    console.log(`Marked ${markedCount} teachers as not teaching`);

    return new Response(
      JSON.stringify({ 
        message: `Checked ${schedules?.length || 0} schedules, marked ${markedCount} as not teaching`,
        date: todayStr,
        day: currentDay,
        time: currentTime,
        checkOutTime,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in mark-teachers-not-teaching:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
