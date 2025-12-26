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

    console.log(`Running auto-alpha attendance for ${todayStr} at ${currentTime} WIB`);

    // Skip Friday (5) - school holiday
    if (dayOfWeek === 5) {
      console.log("Friday (Jumat), skipping auto-alpha - school holiday");
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
      console.log(`Today is a holiday (${holiday.name}), skipping auto-alpha`);
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

    // Preload approved leave map for today (teacher_id -> request_type)
    const { data: approvedLeaves } = await supabase
      .from('teacher_leave_requests')
      .select('teacher_id, request_type')
      .eq('status', 'approved')
      .lte('start_date', todayStr)
      .gte('end_date', todayStr);

    const leaveMap = new Map<string, string>((approvedLeaves || []).map((r: any) => [r.teacher_id, r.request_type]));

    // Get day name for schedule check
    const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const todayDayName = dayNames[dayOfWeek];

    // Preload schedules for today to check which teachers have teaching duties
    const { data: todaySchedules } = await supabase
      .from('schedules')
      .select('teacher_id')
      .eq('day', todayDayName);

    const teachersWithScheduleToday = new Set((todaySchedules || []).map((s: any) => s.teacher_id));

    let teachersMarked = 0;
    let studentsMarked = 0;
    let teachersSkipped = 0;

    // Get all teachers/staff
    const { data: allProfiles } = await supabase
      .from("profiles")
      .select("id, full_name, role, can_teach")
      .in("role", ["teacher", "staff"]);

    for (const profile of allProfiles || []) {
      // Check if attendance record already exists for today
      const { data: attendance } = await supabase
        .from("attendance")
        .select("id, status")
        .eq("user_id", profile.id)
        .eq("date", todayStr)
        .maybeSingle();

      // If no attendance record exists, insert one
      if (!attendance) {
        // Check if this teacher has an approved leave
        const leaveType = leaveMap.get(profile.id); // 'izin' | 'sakit' for teacher on approved leave
        
        if (leaveType) {
          // Teacher has approved leave - insert izin/sakit
          const { error } = await supabase
            .from("attendance")
            .insert({
              user_id: profile.id,
              date: todayStr,
              status: leaveType,
              type: 'permission',
            });

          if (error) {
            console.error(`Error marking ${profile.full_name} as ${leaveType}:`, error);
          } else {
            teachersMarked++;
            console.log(`Marked ${profile.full_name} as ${leaveType} (approved leave)`);
          }
        } else if (profile.role === 'teacher' && profile.can_teach !== false) {
          // Check if teacher has schedule today - if no schedule, skip alpha
          if (!teachersWithScheduleToday.has(profile.id)) {
            console.log(`${profile.full_name} has no schedule today, skipping alpha`);
            teachersSkipped++;
            continue;
          }
          
          // Teacher has schedule but didn't attend - mark as alpha
          const { error } = await supabase
            .from("attendance")
            .insert({
              user_id: profile.id,
              date: todayStr,
              status: 'alpha',
              type: 'auto',
            });

          if (error) {
            console.error(`Error marking ${profile.full_name} as alpha:`, error);
          } else {
            teachersMarked++;
            console.log(`Marked ${profile.full_name} as alpha`);
          }
        } else if (profile.role === 'staff') {
          // Staff always need to attend - mark as alpha
          const { error } = await supabase
            .from("attendance")
            .insert({
              user_id: profile.id,
              date: todayStr,
              status: 'alpha',
              type: 'auto',
            });

          if (error) {
            console.error(`Error marking ${profile.full_name} as alpha:`, error);
          } else {
            teachersMarked++;
            console.log(`Marked staff ${profile.full_name} as alpha`);
          }
        }
      } else {
        // Attendance exists - do NOT overwrite hadir/izin/sakit/terlambat
        console.log(`${profile.full_name} already has attendance status: ${attendance.status}, skipping`);
      }
    }

    // Get all students with class
    const { data: allStudents } = await supabase
      .from("students")
      .select("id, name, class_id")
      .not("class_id", "is", null);

    for (const student of allStudents || []) {
      // Check if attendance record exists for today
      const { data: attendance } = await supabase
        .from("student_attendance")
        .select("id, status")
        .eq("student_id", student.id)
        .eq("date", todayStr)
        .maybeSingle();

      // Only insert if no record exists
      if (!attendance) {
        const { error } = await supabase
          .from("student_attendance")
          .insert({
            student_id: student.id,
            class_id: student.class_id,
            date: todayStr,
            status: "alpha",
            notes: "Otomatis ditandai alpha",
          });

        if (error) {
          console.error(`Error marking student ${student.name} as alpha:`, error);
        } else {
          studentsMarked++;
          console.log(`Marked student ${student.name} as alpha`);
        }
      } else {
        console.log(`Student ${student.name} already has attendance status: ${attendance.status}, skipping`);
      }
    }

    console.log(`Completed: ${teachersMarked} teachers/staff marked, ${teachersSkipped} teachers skipped (no schedule), ${studentsMarked} students marked`);

    return new Response(
      JSON.stringify({
        message: `Auto-alpha completed`,
        date: todayStr,
        time: currentTime,
        teachersMarked,
        teachersSkipped,
        studentsMarked,
        checkOutTime,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in auto-alpha-attendance:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
