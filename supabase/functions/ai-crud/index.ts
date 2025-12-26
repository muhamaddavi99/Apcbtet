import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ActionType = 
  | "create_announcement" 
  | "create_student" 
  | "create_attendance" 
  | "update_school_settings";

interface RequestBody {
  action: ActionType;
  data: Record<string, any>;
  user_id: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, data, user_id }: RequestBody = await req.json();
    console.log(`AI CRUD action: ${action}`, data);

    // Verify user role (must be admin or staff)
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user_id)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!["admin", "staff"].includes(profile.role)) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Only admin or staff can perform this action" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let result: any;

    switch (action) {
      case "create_announcement": {
        const { title, content, priority = "normal" } = data;
        if (!title || !content) {
          return new Response(
            JSON.stringify({ error: "Title and content are required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { data: announcement, error } = await supabase
          .from("announcements")
          .insert({
            title,
            content,
            priority,
            created_by: user_id,
          })
          .select()
          .single();

        if (error) throw error;
        result = { success: true, announcement, message: "Pengumuman berhasil dibuat" };
        break;
      }

      case "create_student": {
        const { name, nis, gender, class_id, birth_date, phone, address } = data;
        if (!name || !nis) {
          return new Response(
            JSON.stringify({ error: "Name and NIS are required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Check if NIS already exists
        const { data: existingStudent } = await supabase
          .from("students")
          .select("id")
          .eq("nis", nis)
          .maybeSingle();

        if (existingStudent) {
          return new Response(
            JSON.stringify({ error: `NIS ${nis} sudah terdaftar` }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { data: student, error } = await supabase
          .from("students")
          .insert({
            name,
            nis,
            gender: gender || null,
            class_id: class_id || null,
            birth_date: birth_date || null,
            phone: phone || null,
            address: address || null,
          })
          .select()
          .single();

        if (error) throw error;
        result = { success: true, student, message: "Data siswa berhasil dibuat" };
        break;
      }

      case "create_attendance": {
        const { date, attendances } = data;
        // attendances: [{ user_id, status, check_in?, check_out? }]
        
        if (!date || !attendances || !Array.isArray(attendances)) {
          return new Response(
            JSON.stringify({ error: "Date and attendances array are required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const records = attendances.map((att: any) => ({
          user_id: att.user_id,
          date,
          status: att.status || "hadir",
          check_in: att.check_in || null,
          check_out: att.check_out || null,
          type: "manual",
        }));

        // Upsert attendance records
        const { data: inserted, error } = await supabase
          .from("attendance")
          .upsert(records, { onConflict: "user_id,date" })
          .select();

        if (error) throw error;
        result = { success: true, count: inserted?.length || 0, message: `${inserted?.length || 0} data absensi berhasil disimpan` };
        break;
      }

      case "update_school_settings": {
        const { school_name, school_address, school_phone, check_in_time, late_time, check_out_time } = data;
        
        // Get existing settings
        const { data: existingSettings } = await supabase
          .from("school_settings")
          .select("id")
          .limit(1)
          .maybeSingle();

        const updateData: Record<string, any> = {};
        if (school_name) updateData.school_name = school_name;
        if (school_address) updateData.school_address = school_address;
        if (school_phone) updateData.school_phone = school_phone;
        if (check_in_time) updateData.check_in_time = check_in_time;
        if (late_time) updateData.late_time = late_time;
        if (check_out_time) updateData.check_out_time = check_out_time;

        if (Object.keys(updateData).length === 0) {
          return new Response(
            JSON.stringify({ error: "No data to update" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        let settings;
        if (existingSettings) {
          const { data: updated, error } = await supabase
            .from("school_settings")
            .update(updateData)
            .eq("id", existingSettings.id)
            .select()
            .single();
          if (error) throw error;
          settings = updated;
        } else {
          const { data: inserted, error } = await supabase
            .from("school_settings")
            .insert(updateData)
            .select()
            .single();
          if (error) throw error;
          settings = inserted;
        }

        result = { success: true, settings, message: "Pengaturan sekolah berhasil diperbarui" };
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("AI CRUD error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
