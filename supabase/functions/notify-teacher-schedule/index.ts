import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const dayNames = ["Ahad", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get current day
    const now = new Date();
    // Adjust for Indonesia timezone (UTC+7)
    const indonesiaTime = new Date(now.getTime() + (7 * 60 * 60 * 1000));
    const dayIndex = indonesiaTime.getUTCDay();
    const today = dayNames[dayIndex];

    console.log(`Checking schedules for: ${today}`);

    // Get all teachers with their schedules for today
    const { data: teachers, error: teacherError } = await supabase
      .from("profiles")
      .select("id, full_name, email, role")
      .eq("role", "teacher");

    if (teacherError) throw teacherError;

    console.log(`Found ${teachers?.length || 0} teachers`);

    for (const teacher of teachers || []) {
      // Get today's schedule for this teacher
      const { data: schedules, error: scheduleError } = await supabase
        .from("schedules")
        .select("*, subjects(name), classes(name)")
        .eq("teacher_id", teacher.id)
        .eq("day", today)
        .order("start_time");

      if (scheduleError) {
        console.error(`Error fetching schedule for ${teacher.full_name}:`, scheduleError);
        continue;
      }

      if (!schedules || schedules.length === 0) {
        console.log(`No schedule for ${teacher.full_name} today`);
        continue;
      }

      // Format schedule as HTML
      const scheduleHtml = schedules.map((s: any) => `
        <tr>
          <td style="padding: 10px; border: 1px solid #ddd;">${s.start_time} - ${s.end_time}</td>
          <td style="padding: 10px; border: 1px solid #ddd;">${s.subjects?.name || '-'}</td>
          <td style="padding: 10px; border: 1px solid #ddd;">${s.classes?.name || '-'}</td>
        </tr>
      `).join("");

      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 10px 10px; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th { background: #667eea; color: white; padding: 12px; text-align: left; }
            td { padding: 10px; border: 1px solid #ddd; background: white; }
            .footer { text-align: center; margin-top: 20px; color: #888; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📚 Jadwal Mengajar Hari Ini</h1>
              <p>${today}, ${indonesiaTime.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>
            <div class="content">
              <p>Assalamu'alaikum Wr. Wb.</p>
              <p>Selamat pagi <strong>${teacher.full_name}</strong>,</p>
              <p>Berikut adalah jadwal mengajar Anda hari ini:</p>
              
              <table>
                <thead>
                  <tr>
                    <th>Waktu</th>
                    <th>Mata Pelajaran</th>
                    <th>Kelas</th>
                  </tr>
                </thead>
                <tbody>
                  ${scheduleHtml}
                </tbody>
              </table>
              
              <p>Semoga hari Anda menyenangkan dan penuh berkah. 🙏</p>
              
              <p>Wassalamu'alaikum Wr. Wb.</p>
            </div>
            <div class="footer">
              <p>Email ini dikirim secara otomatis oleh Sistem Informasi Sekolah</p>
              <p>© ${new Date().getFullYear()} MA Al-Ittifaqiah 2</p>
            </div>
          </div>
        </body>
        </html>
      `;

      // Send email
      try {
        const { error: emailError } = await resend.emails.send({
          from: "Sistem Sekolah <noreply@kaakangsatir.my.id>",
          to: [teacher.email],
          subject: `📚 Jadwal Mengajar Anda Hari Ini - ${today}`,
          html: emailHtml,
        });

        if (emailError) {
          console.error(`Error sending email to ${teacher.email}:`, emailError);
        } else {
          console.log(`Email sent successfully to ${teacher.full_name} (${teacher.email})`);
        }
      } catch (emailErr) {
        console.error(`Failed to send email to ${teacher.email}:`, emailErr);
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: "Schedule notifications sent" }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in notify-teacher-schedule:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
