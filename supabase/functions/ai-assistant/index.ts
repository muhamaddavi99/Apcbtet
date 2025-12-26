import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Check if message is asking for image generation (new image)
function isGenerateImageRequest(message: string): boolean {
  const generateKeywords = [
    "buatkan gambar", "generate gambar", "buat foto", "buat gambar",
    "generate image", "create image", "bikin gambar", "bikin foto",
    "buatkan logo", "buat logo", "design logo", "desain logo"
  ];
  const lowerMessage = message.toLowerCase();
  return generateKeywords.some(keyword => lowerMessage.includes(keyword));
}

// Check if message is asking for existing database image
function isDatabaseImageRequest(message: string): { isRequest: boolean; imageType: string | null; searchTerm?: string } {
  const lowerMessage = message.toLowerCase();
  
  // School profile/icon request
  const schoolIconKeywords = [
    "foto profil sekolah", "foto sekolah", "logo sekolah", "icon sekolah", "ikon sekolah",
    "gambar sekolah", "photo sekolah", "picture sekolah", "tampilkan logo sekolah",
    "kirim foto sekolah", "berikan foto sekolah", "lihat logo sekolah", "lihat foto sekolah",
    "school logo", "school icon", "school photo", "school image"
  ];
  
  if (schoolIconKeywords.some(keyword => lowerMessage.includes(keyword))) {
    return { isRequest: true, imageType: "school_icon" };
  }
  
  // Announcement image request
  const announcementKeywords = [
    "foto pengumuman", "gambar pengumuman", "image pengumuman", "picture pengumuman",
    "tampilkan pengumuman", "lihat pengumuman", "foto dari pengumuman", "gambar dari pengumuman"
  ];
  
  if (announcementKeywords.some(keyword => lowerMessage.includes(keyword))) {
    return { isRequest: true, imageType: "announcement_image" };
  }
  
  // Teacher avatar request  
  const teacherAvatarKeywords = [
    "foto guru", "foto profil guru", "avatar guru", "gambar guru"
  ];
  
  if (teacherAvatarKeywords.some(keyword => lowerMessage.includes(keyword))) {
    return { isRequest: true, imageType: "teacher_avatar" };
  }
  
  // Student avatar request
  const studentAvatarKeywords = [
    "foto siswa", "foto profil siswa", "avatar siswa", "gambar siswa"
  ];
  
  if (studentAvatarKeywords.some(keyword => lowerMessage.includes(keyword))) {
    return { isRequest: true, imageType: "student_avatar" };
  }
  
  // Generic all images request
  const allImagesKeywords = [
    "semua foto", "semua gambar", "all images", "all photos", "daftar foto", "daftar gambar",
    "foto yang ada", "gambar yang ada", "foto di database", "gambar di database"
  ];
  
  if (allImagesKeywords.some(keyword => lowerMessage.includes(keyword))) {
    return { isRequest: true, imageType: "all_images" };
  }
  
  return { isRequest: false, imageType: null };
}

// Check if message is asking for leave request information
function isLeaveRequestQuery(message: string): boolean {
  const lowerMessage = message.toLowerCase();
  const leaveKeywords = [
    "perizinan", "izin saya", "cuti saya", "status izin", "status perizinan",
    "pengajuan izin", "pengajuan cuti", "izin/sakit", "sakit saya",
    "lihat perizinan", "riwayat izin", "riwayat perizinan", "leave request",
    "my leave", "permohonan izin", "permohonan cuti"
  ];
  return leaveKeywords.some(keyword => lowerMessage.includes(keyword));
}

// Check if message is asking to VIEW announcement information (not create)
function isViewAnnouncementQuery(message: string): boolean {
  const lowerMessage = message.toLowerCase();
  
  // Keywords that indicate viewing/showing announcements
  const viewKeywords = [
    "lihat pengumuman", "tampilkan pengumuman", "tunjukkan pengumuman", 
    "apa pengumuman", "ada pengumuman", "pengumuman terbaru", "pengumuman hari ini",
    "daftar pengumuman", "cari pengumuman", "info pengumuman", "berita sekolah",
    "show announcement", "view announcement", "list announcement",
    "pengumuman apa saja", "pengumuman yang ada", "semua pengumuman"
  ];
  
  // Keywords that indicate creating announcements (should NOT match)
  const createKeywords = [
    "buat pengumuman", "buatkan pengumuman", "bikin pengumuman", 
    "generate pengumuman", "tulis pengumuman", "susun pengumuman",
    "create announcement", "make announcement", "draft pengumuman"
  ];
  
  // Check if it's a create request first - if so, return false
  const isCreateRequest = createKeywords.some(keyword => lowerMessage.includes(keyword));
  if (isCreateRequest) {
    return false;
  }
  
  // Check if it's a view request
  return viewKeywords.some(keyword => lowerMessage.includes(keyword));
}

// Fetch image from database based on type
async function fetchDatabaseImage(imageType: string, supabase: any, message: string): Promise<{ url: string | null; urls?: string[]; description: string }> {
  switch (imageType) {
    case "school_icon": {
      const { data: settings } = await supabase
        .from("school_settings")
        .select("school_icon_url, school_name")
        .limit(1)
        .maybeSingle();
      
      if (settings?.school_icon_url) {
        return { 
          url: settings.school_icon_url, 
          description: `Berikut foto profil/logo ${settings.school_name || "sekolah"}:` 
        };
      }
      return { url: null, description: "Maaf, foto profil sekolah belum diatur. Silakan upload foto di menu Settings." };
    }
    
    case "announcement_image": {
      const { data: announcements } = await supabase
        .from("announcements")
        .select("title, image_url, created_at")
        .not("image_url", "is", null)
        .order("created_at", { ascending: false })
        .limit(5);
      
      if (announcements && announcements.length > 0) {
        const lowerMessage = message.toLowerCase();
        // Try to find specific announcement by title
        const matchedAnnouncement = announcements.find((a: any) => 
          lowerMessage.includes(a.title.toLowerCase())
        );
        
        if (matchedAnnouncement?.image_url) {
          return { 
            url: matchedAnnouncement.image_url, 
            description: `Berikut gambar dari pengumuman "${matchedAnnouncement.title}":` 
          };
        }
        
        // Return latest announcement with image
        return { 
          url: announcements[0].image_url, 
          description: `Berikut gambar dari pengumuman terbaru "${announcements[0].title}":` 
        };
      }
      return { url: null, description: "Maaf, tidak ada pengumuman dengan gambar." };
    }
    
    case "teacher_avatar": {
      const { data: teachers } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .in("role", ["teacher", "staff"])
        .not("avatar_url", "is", null);
      
      if (teachers && teachers.length > 0) {
        const lowerMessage = message.toLowerCase();
        const matchedTeacher = teachers.find((t: any) => 
          lowerMessage.includes(t.full_name.toLowerCase())
        );
        
        if (matchedTeacher?.avatar_url) {
          return { 
            url: matchedTeacher.avatar_url, 
            description: `Berikut foto profil ${matchedTeacher.full_name}:` 
          };
        }
        
        const firstWithAvatar = teachers.find((t: any) => t.avatar_url);
        if (firstWithAvatar) {
          return { 
            url: firstWithAvatar.avatar_url, 
            description: `Berikut foto profil ${firstWithAvatar.full_name}:` 
          };
        }
      }
      return { url: null, description: "Maaf, tidak ditemukan foto guru yang diminta." };
    }
    
    case "student_avatar": {
      const { data: students } = await supabase
        .from("students")
        .select("name, avatar_url")
        .not("avatar_url", "is", null);
      
      if (students && students.length > 0) {
        const lowerMessage = message.toLowerCase();
        const matchedStudent = students.find((s: any) => 
          lowerMessage.includes(s.name.toLowerCase())
        );
        
        if (matchedStudent?.avatar_url) {
          return { 
            url: matchedStudent.avatar_url, 
            description: `Berikut foto profil ${matchedStudent.name}:` 
          };
        }
        
        const firstWithAvatar = students.find((s: any) => s.avatar_url);
        if (firstWithAvatar) {
          return { 
            url: firstWithAvatar.avatar_url, 
            description: `Berikut foto profil ${firstWithAvatar.name}:` 
          };
        }
      }
      return { url: null, description: "Maaf, tidak ditemukan foto siswa yang diminta." };
    }
    
    case "all_images": {
      const allUrls: string[] = [];
      let description = "Berikut daftar foto yang ada di database:\n\n";
      
      // Get school icon
      const { data: settings } = await supabase
        .from("school_settings")
        .select("school_icon_url, school_name")
        .limit(1)
        .maybeSingle();
      
      if (settings?.school_icon_url) {
        allUrls.push(settings.school_icon_url);
        description += `📷 Logo Sekolah (${settings.school_name})\n`;
      }
      
      // Get announcement images
      const { data: announcements } = await supabase
        .from("announcements")
        .select("title, image_url")
        .not("image_url", "is", null)
        .limit(5);
      
      if (announcements && announcements.length > 0) {
        announcements.forEach((a: any) => {
          allUrls.push(a.image_url);
          description += `📣 Pengumuman: ${a.title}\n`;
        });
      }
      
      // Get teacher avatars
      const { data: teachers } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .not("avatar_url", "is", null)
        .limit(5);
      
      if (teachers && teachers.length > 0) {
        teachers.forEach((t: any) => {
          allUrls.push(t.avatar_url);
          description += `👤 Guru: ${t.full_name}\n`;
        });
      }
      
      // Get student avatars
      const { data: students } = await supabase
        .from("students")
        .select("name, avatar_url")
        .not("avatar_url", "is", null)
        .limit(5);
      
      if (students && students.length > 0) {
        students.forEach((s: any) => {
          allUrls.push(s.avatar_url);
          description += `🎓 Siswa: ${s.name}\n`;
        });
      }
      
      if (allUrls.length > 0) {
        return { 
          url: allUrls[0], 
          urls: allUrls,
          description 
        };
      }
      return { url: null, description: "Tidak ada foto yang tersimpan di database." };
    }
    
    default:
      return { url: null, description: "Jenis gambar tidak dikenali." };
  }
}

// Generate image using Lovable AI
async function generateImage(prompt: string, apiKey: string): Promise<string | null> {
  try {
    console.log("Generating image with prompt:", prompt);
    
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image-preview",
        messages: [
          {
            role: "user",
            content: `Generate a beautiful, professional, high-quality image based on this description: ${prompt}. Make it visually appealing and suitable for educational/school context.`,
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      console.error("Image generation failed:", response.status);
      return null;
    }

    const data = await response.json();
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    if (!imageUrl) {
      console.error("No image in response");
      return null;
    }

    return imageUrl;
  } catch (error) {
    console.error("Image generation error:", error);
    return null;
  }
}

// Upload base64 image to Supabase Storage
async function uploadImageToStorage(base64Image: string, supabase: any): Promise<string | null> {
  try {
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");
    const imageBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
    
    const fileName = `ai-chat/${Date.now()}-${Math.random().toString(36).substring(7)}.png`;
    
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(fileName, imageBytes, {
        contentType: "image/png",
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return base64Image; // Return base64 if upload fails
    }

    const { data: { publicUrl } } = supabase.storage
      .from("avatars")
      .getPublicUrl(fileName);

    return publicUrl;
  } catch (error) {
    console.error("Upload error:", error);
    return base64Image;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, type, generateImageOnly } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if this is a database image request first
    const lastMessage = messages[messages.length - 1]?.content || "";
    const dbImageCheck = isDatabaseImageRequest(lastMessage);
    
    if (dbImageCheck.isRequest && dbImageCheck.imageType) {
      console.log("Detected database image request:", dbImageCheck.imageType);
      
      const result = await fetchDatabaseImage(dbImageCheck.imageType, supabase, lastMessage);
      
      if (result.url) {
        return new Response(
          JSON.stringify({ 
            type: "image",
            imageUrl: result.url,
            message: result.description
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } else {
        // Return text message if no image found
        return new Response(
          JSON.stringify({ 
            type: "text",
            message: result.description
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Get user info from authorization header for personalized queries
    const authHeader = req.headers.get("authorization");
    let userId: string | null = null;
    
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    // Check if asking about leave requests
    if (isLeaveRequestQuery(lastMessage) && userId) {
      console.log("Detected leave request query for user:", userId);
      
      const { data: leaveRequests } = await supabase
        .from("teacher_leave_requests")
        .select("*")
        .eq("teacher_id", userId)
        .order("created_at", { ascending: false })
        .limit(10);
      
      if (leaveRequests && leaveRequests.length > 0) {
        let leaveInfo = "## 📋 Riwayat Perizinan Anda\n\n";
        leaveInfo += "---\n\n";
        
        for (let i = 0; i < leaveRequests.length; i++) {
          const req = leaveRequests[i];
          const statusEmoji = req.status === 'approved' ? '✅' : req.status === 'rejected' ? '❌' : '⏳';
          const statusText = req.status === 'approved' ? '**Disetujui**' : req.status === 'rejected' ? '**Ditolak**' : '*Menunggu*';
          const typeText = req.request_type === 'sakit' ? '🏥 Sakit' : '📝 Izin';
          
          const startDate = new Date(req.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
          const endDate = new Date(req.end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
          
          leaveInfo += `### ${i + 1}. ${typeText}\n\n`;
          leaveInfo += `| Status | Tanggal |\n`;
          leaveInfo += `|--------|--------|\n`;
          leaveInfo += `| ${statusEmoji} ${statusText} | 📅 ${startDate}${req.start_date !== req.end_date ? ` - ${endDate}` : ''} |\n\n`;
          leaveInfo += `> ${req.reason}\n\n`;
          
          if (req.rejection_reason) {
            leaveInfo += `⚠️ *Alasan ditolak: ${req.rejection_reason}*\n\n`;
          }
          
          if (i < leaveRequests.length - 1) {
            leaveInfo += "---\n\n";
          }
        }
        
        const pending = leaveRequests.filter(r => r.status === 'pending').length;
        const approved = leaveRequests.filter(r => r.status === 'approved').length;
        const rejected = leaveRequests.filter(r => r.status === 'rejected').length;
        
        leaveInfo += "\n\n^^^";
        leaveInfo += `\n\n### 📊 Ringkasan\n`;
        leaveInfo += `* ⏳ Menunggu: **${pending}**\n`;
        leaveInfo += `* ✅ Disetujui: **${approved}**\n`;
        leaveInfo += `* ❌ Ditolak: **${rejected}**\n`;
        
        return new Response(
          JSON.stringify({ 
            type: "text",
            message: leaveInfo
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } else {
        return new Response(
          JSON.stringify({ 
            type: "text",
            message: "📭 *Anda belum memiliki riwayat pengajuan perizinan.*\n\nAnda bisa mengajukan izin atau sakit melalui menu **Perizinan Guru**."
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Check if asking to VIEW announcements (not create)
    if (isViewAnnouncementQuery(lastMessage)) {
      console.log("Detected VIEW announcement query");
      
      const { data: announcements } = await supabase
        .from("announcements")
        .select("title, content, priority, created_at, image_url")
        .order("created_at", { ascending: false })
        .limit(5);
      
      if (announcements && announcements.length > 0) {
        let announcementInfo = "## 📢 Pengumuman Terbaru\n\n";
        announcementInfo += "---\n\n";
        
        for (let i = 0; i < announcements.length; i++) {
          const ann = announcements[i];
          const priorityLabel = ann.priority === 'high' ? '🔴 **PENTING**' : ann.priority === 'medium' ? '🟡 *Sedang*' : '🟢 Normal';
          const hasImage = ann.image_url ? ' 🖼️' : '';
          const dateStr = new Date(ann.created_at!).toLocaleDateString('id-ID', { 
            weekday: 'long', 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric' 
          });
          
          announcementInfo += `### ${i + 1}. ${ann.title}${hasImage}\n\n`;
          announcementInfo += `> ${ann.content.substring(0, 150)}${ann.content.length > 150 ? '...' : ''}\n\n`;
          announcementInfo += `📅 *${dateStr}* | ${priorityLabel}\n\n`;
          
          if (i < announcements.length - 1) {
            announcementInfo += "---\n\n";
          }
        }
        
        announcementInfo += "\n\n^^^";
        announcementInfo += "\n\n💡 *Untuk melihat semua pengumuman lengkap, buka menu **Riwayat Pengumuman**.*";
        
        return new Response(
          JSON.stringify({ 
            type: "text",
            message: announcementInfo
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } else {
        return new Response(
          JSON.stringify({ 
            type: "text",
            message: "📭 *Belum ada pengumuman yang dipublikasikan.*\n\nPengumuman baru akan muncul di sini ketika dibuat."
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }
    
    // Check if this is an image generation request
    const shouldGenerateImage = generateImageOnly || isGenerateImageRequest(lastMessage);

    if (shouldGenerateImage) {
      console.log("Detected image generation request, generating image...");
      
      const imageUrl = await generateImage(lastMessage, LOVABLE_API_KEY);
      
      if (imageUrl) {
        // Upload to storage
        const storedUrl = await uploadImageToStorage(imageUrl, supabase);
        
        return new Response(
          JSON.stringify({ 
            type: "image",
            imageUrl: storedUrl,
            message: "Berikut gambar yang berhasil dibuat:"
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Fetch school settings for context
    const { data: schoolSettings } = await supabase
      .from("school_settings")
      .select("*")
      .limit(1)
      .maybeSingle();

    // Fetch summary stats for context
    const today = new Date().toISOString().split("T")[0];
    const { data: todayAttendance } = await supabase
      .from("attendance")
      .select("status")
      .eq("date", today);

    const { count: teacherCount } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .neq("role", "admin");

    const { count: studentCount } = await supabase
      .from("students")
      .select("id", { count: "exact", head: true });

    const { count: classCount } = await supabase
      .from("classes")
      .select("id", { count: "exact", head: true });

    const attendanceStats = {
      hadir: todayAttendance?.filter((a) => a.status === "hadir").length || 0,
      izin: todayAttendance?.filter((a) => a.status === "izin").length || 0,
      sakit: todayAttendance?.filter((a) => a.status === "sakit").length || 0,
      alpha: todayAttendance?.filter((a) => a.status === "alpha").length || 0,
    };

    // Get classes for context
    const { data: classes } = await supabase
      .from("classes")
      .select("id, name, grade");

    // Get teachers for context
    const { data: teachers } = await supabase
      .from("profiles")
      .select("id, full_name, nip")
      .in("role", ["teacher", "staff"]);

    // System prompts based on type
    const systemPrompts: Record<string, string> = {
      chat: `Kamu adalah AI Asisten untuk sistem manajemen sekolah "${schoolSettings?.school_name || "Sekolah"}".
      
Konteks Sekolah:
- Nama: ${schoolSettings?.school_name || "Tidak diketahui"}
- Alamat: ${schoolSettings?.school_address || "Tidak diketahui"}
- Jam Masuk: ${schoolSettings?.check_in_time?.slice(0, 5) || "07:00"}
- Jam Terlambat: ${schoolSettings?.late_time?.slice(0, 5) || "07:30"}
- Jam Pulang: ${schoolSettings?.check_out_time?.slice(0, 5) || "14:00"}
- Total Guru: ${teacherCount || 0}
- Total Siswa: ${studentCount || 0}
- Total Kelas: ${classCount || 0}

Statistik Absensi Hari Ini (${today}):
- Hadir: ${attendanceStats.hadir}
- Izin: ${attendanceStats.izin}
- Sakit: ${attendanceStats.sakit}
- Alpha: ${attendanceStats.alpha}

KEMAMPUAN KHUSUS:
- Kamu bisa generate gambar! Jika user meminta gambar, foto, logo, atau ilustrasi, sistem akan otomatis membuat gambar tersebut.

Tugas kamu:
1. Menjawab pertanyaan tentang absensi, jadwal, dan statistik sekolah
2. Memberikan informasi yang akurat berdasarkan data
3. Berbicara dalam Bahasa Indonesia yang sopan dan profesional
4. Jika diminta gambar/foto, jelaskan bahwa kamu akan membuatnya
5. Jika tidak tahu jawabannya, katakan dengan jujur`,

      analyze: `Kamu adalah AI Analis Data untuk sistem manajemen sekolah "${schoolSettings?.school_name || "Sekolah"}".

Konteks Data:
- Total Guru: ${teacherCount || 0}
- Total Siswa: ${studentCount || 0}
- Total Kelas: ${classCount || 0}
- Jam Operasional: ${schoolSettings?.check_in_time?.slice(0, 5) || "07:00"} - ${schoolSettings?.check_out_time?.slice(0, 5) || "14:00"}

Statistik Absensi Hari Ini:
- Hadir: ${attendanceStats.hadir} (${teacherCount ? Math.round((attendanceStats.hadir / teacherCount) * 100) : 0}%)
- Izin: ${attendanceStats.izin}
- Sakit: ${attendanceStats.sakit}
- Alpha: ${attendanceStats.alpha}

Tugas kamu:
1. Menganalisis data absensi dan memberikan insight
2. Memberikan rekomendasi berdasarkan pola yang terlihat
3. Menjelaskan tren dan anomali
4. Berbicara dalam Bahasa Indonesia yang jelas`,

      announcement: `Kamu adalah AI Pembuat Pengumuman untuk sekolah "${schoolSettings?.school_name || "Sekolah"}".

Konteks Sekolah:
- Nama: ${schoolSettings?.school_name || "Sekolah"}
- Alamat: ${schoolSettings?.school_address || ""}
- Telepon: ${schoolSettings?.school_phone || ""}

Tugas kamu:
1. Membantu membuat pengumuman sekolah yang profesional
2. Menggunakan format yang rapi dan mudah dibaca
3. Menyesuaikan tone dengan konteks (formal untuk resmi, semi-formal untuk harian)
4. Menyertakan informasi penting seperti tanggal, waktu, tempat jika diperlukan
5. Berbicara dalam Bahasa Indonesia yang baik dan benar
6. Format pengumuman dengan judul di baris pertama`,

      crud: `Kamu adalah AI Database Assistant untuk sekolah "${schoolSettings?.school_name || "Sekolah"}".
Kamu membantu admin/staff untuk mengelola data sekolah melalui percakapan natural.

KEMAMPUAN KAMU:
1. Membuat pengumuman baru (create_announcement)
2. Menambah data siswa baru (create_student)
3. Membuat/mengubah data absensi (create_attendance)
4. Mengubah pengaturan sekolah (update_school_settings)

DATA TERSEDIA:
Kelas: ${JSON.stringify(classes?.map(c => ({ id: c.id, name: c.name, grade: c.grade })) || [])}
Guru: ${JSON.stringify(teachers?.map(t => ({ id: t.id, name: t.full_name, nip: t.nip })) || [])}

PENGATURAN SAAT INI:
- Nama Sekolah: ${schoolSettings?.school_name || ""}
- Alamat: ${schoolSettings?.school_address || ""}
- Telepon: ${schoolSettings?.school_phone || ""}
- Jam Masuk: ${schoolSettings?.check_in_time || "07:00"}
- Jam Terlambat: ${schoolSettings?.late_time || "07:30"}
- Jam Pulang: ${schoolSettings?.check_out_time || "14:00"}

INSTRUKSI PENTING:
Ketika user meminta untuk membuat/mengubah data:

1. JANGAN tampilkan raw JSON ke user, berikan penjelasan yang mudah dibaca dengan format markdown yang bagus
2. Jelaskan data yang akan disimpan dengan format yang mudah dipahami
3. Di AKHIR response saja, tambahkan JSON dalam format berikut (user tidak akan lihat ini, sistem akan parsing otomatis):

<!-- ACTION_DATA
{"action": "create_announcement", "data": {"title": "...", "content": "...", "priority": "normal"}}
ACTION_DATA_END -->

CONTOH RESPONSE YANG BENAR:
"Baik, saya akan membuatkan pengumuman untuk libur akhir semester.

## 📢 Draft Pengumuman

**Judul:** Hari Libur Akhir Semester

**Isi:**
> Diberitahukan kepada seluruh siswa dan staf bahwa libur akhir semester akan dilaksanakan mulai tanggal 20 Juni 2024 hingga 1 Juli 2024.

**Prioritas:** 🟢 Normal

---

Klik tombol **Simpan** di bawah jika Anda ingin menyimpan pengumuman ini.

<!-- ACTION_DATA
{"action": "create_announcement", "data": {"title": "Hari Libur Akhir Semester", "content": "Diberitahukan kepada seluruh siswa dan staf bahwa libur akhir semester akan dilaksanakan mulai tanggal 20 Juni 2024 hingga 1 Juli 2024.", "priority": "normal"}}
ACTION_DATA_END -->"

JENIS ACTION:
1. Pengumuman: { "action": "create_announcement", "data": { "title": "...", "content": "...", "priority": "normal|high" } }
2. Siswa: { "action": "create_student", "data": { "name": "...", "nis": "...", "gender": "L|P", "class_id": "uuid" } }
3. Settings: { "action": "update_school_settings", "data": { "school_name": "...", "check_in_time": "HH:MM" } }
4. Absensi: { "action": "create_attendance", "data": { "date": "YYYY-MM-DD", "attendances": [{ "user_id": "...", "status": "hadir|izin|sakit|alpha" }] } }`,
    };

    const systemPrompt = systemPrompts[type] || systemPrompts.chat;

    // Call Lovable AI Gateway
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit tercapai, coba lagi nanti." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Kredit habis, silakan top up di settings." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI gateway error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("AI assistant error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
