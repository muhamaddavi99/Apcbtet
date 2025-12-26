import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ResetPasswordRequest {
  email: string;
  redirectUrl?: string; // optional, e.g. https://yourdomain.com/reset-password
}

const generateEmailTemplate = (resetLink: string) => `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Password - MA Al-Ittifaqiah 2</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7f6;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 16px; box-shadow: 0 10px 40px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 30px; text-align: center; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); border-radius: 16px 16px 0 0;">
              <div style="width: 80px; height: 80px; background-color: rgba(255,255,255,0.2); border-radius: 20px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 20px;">
                <span style="font-size: 40px;">🎓</span>
              </div>
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                Sistem Informasi Sekolah
              </h1>
              <p style="margin: 10px 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">
                Sistem Informasi Guru & Staf
              </p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; color: #1f2937; font-size: 24px; font-weight: 600; text-align: center;">
                Reset Password Anda
              </h2>
              
              <p style="margin: 0 0 25px; color: #6b7280; font-size: 16px; line-height: 1.6; text-align: center;">
                Kami menerima permintaan untuk mereset password akun Anda. Klik tombol di bawah ini untuk membuat password baru.
              </p>
              
              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="${resetLink}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; border-radius: 12px; box-shadow: 0 4px 15px rgba(34, 197, 94, 0.4); transition: all 0.3s ease;">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- Security Notice -->
              <div style="margin-top: 30px; padding: 20px; background-color: #fef3c7; border-radius: 12px; border-left: 4px solid #f59e0b;">
                <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.5;">
                  ⚠️ <strong>Perhatian:</strong> Link ini akan kadaluarsa dalam 1 jam. Jika Anda tidak meminta reset password, abaikan email ini.
                </p>
              </div>
              
              <!-- Alternative Link -->
              <p style="margin: 25px 0 0; color: #9ca3af; font-size: 13px; text-align: center; line-height: 1.6;">
                Jika tombol tidak berfungsi, salin link berikut ke browser Anda:<br>
                <span style="color: #22c55e; word-break: break-all;">${resetLink}</span>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f9fafb; border-radius: 0 0 16px 16px; text-align: center;">
              <p style="margin: 0 0 10px; color: #6b7280; font-size: 14px;">
                Butuh bantuan? Hubungi administrator sekolah
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                © ${new Date().getFullYear()} Sistem Informasi Sekolah. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData: ResetPasswordRequest = await req.json();
    const { email, redirectUrl: customRedirectUrl } = requestData;

    console.log("Processing password reset for:", email);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Determine redirect URL
    const referer = req.headers.get("referer");
    const origin = req.headers.get("origin");

    let finalRedirectUrl: string;
    if (customRedirectUrl) {
      finalRedirectUrl = customRedirectUrl;
    } else if (referer) {
      finalRedirectUrl = `${new URL(referer).origin}/reset-password`;
    } else if (origin) {
      finalRedirectUrl = `${origin}/reset-password`;
    } else {
      finalRedirectUrl = "https://sittifaqiah-pulse.lovable.app/reset-password";
    }

    console.log("Redirect URL:", finalRedirectUrl);

    // Generate link
    const { data, error: resetError } = await supabase.auth.admin.generateLink({
      type: "recovery",
      email,
      options: {
        redirectTo: finalRedirectUrl,
      },
    });

    if (resetError) {
      console.error("Error generating reset link:", resetError);
      throw new Error("Gagal membuat link reset password");
    }

    const actionLink = data?.properties?.action_link;
    if (!actionLink) {
      throw new Error("Link reset password tidak tersedia");
    }

    // IMPORTANT:
    // Use the action_link generated by the backend (it contains the correct token format).
    // Only override redirect_to to our finalRedirectUrl.
    const urlObj = new URL(actionLink);
    urlObj.searchParams.set("redirect_to", finalRedirectUrl);

    const resetLink = urlObj.toString();

    console.log("Reset link generated successfully");

    const emailResponse = await resend.emails.send({
      from: "Sistem Informasi Sekolah <noreply@kaakangsatir.my.id>",
      to: [email],
      subject: "Reset Password - Sistem Informasi Sekolah",
      html: generateEmailTemplate(resetLink),
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Email reset password berhasil dikirim",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  } catch (error: any) {
    console.error("Error in send-reset-password function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
