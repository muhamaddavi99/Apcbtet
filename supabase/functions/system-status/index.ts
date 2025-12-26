import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// WIB date/time helpers for edge functions
const WIB_TZ = 'Asia/Jakarta';

function getWibNow(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: WIB_TZ }));
}

function getWibDateStr(date: Date = getWibNow()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: WIB_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const map: Record<string, string> = {};
  for (const p of parts) map[p.type] = p.value;
  return `${map.year}-${map.month}-${map.day}`;
}

function getWibTimeStr(date: Date = getWibNow()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: WIB_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const map: Record<string, string> = {};
  for (const p of parts) map[p.type] = p.value;
  return `${map.hour}:${map.minute}`;
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days} hari, ${hours % 24} jam, ${minutes % 60} menit`;
  } else if (hours > 0) {
    return `${hours} jam, ${minutes % 60} menit`;
  } else if (minutes > 0) {
    return `${minutes} menit`;
  } else {
    return `${seconds} detik`;
  }
}

// Measure response time for a database query
async function measureDbResponseTime(supabase: any): Promise<{ time: number; success: boolean }> {
  const start = performance.now();
  try {
    const { error } = await supabase.from('school_settings').select('id').limit(1);
    const time = Math.round(performance.now() - start);
    return { time, success: !error };
  } catch {
    return { time: Math.round(performance.now() - start), success: false };
  }
}

// Check multiple endpoints and measure response times
async function checkEndpointsHealth(supabase: any): Promise<{
  endpoints: Array<{ name: string; responseMs: number; status: 'ok' | 'slow' | 'error' }>;
  avgResponseMs: number;
}> {
  const endpoints = [
    { name: 'school_settings', table: 'school_settings' },
    { name: 'profiles', table: 'profiles' },
    { name: 'classes', table: 'classes' },
    { name: 'subjects', table: 'subjects' },
    { name: 'holidays', table: 'holidays' },
    { name: 'students', table: 'students' },
  ];

  const results = await Promise.all(
    endpoints.map(async (ep) => {
      const start = performance.now();
      try {
        const { error } = await supabase.from(ep.table).select('id').limit(1);
        const responseMs = Math.round(performance.now() - start);
        let status: 'ok' | 'slow' | 'error' = 'ok';
        if (error) status = 'error';
        else if (responseMs > 500) status = 'slow';
        else if (responseMs > 200) status = 'slow';
        return { name: ep.name, responseMs, status };
      } catch {
        return { name: ep.name, responseMs: Math.round(performance.now() - start), status: 'error' as const };
      }
    })
  );

  const avgResponseMs = Math.round(
    results.reduce((sum, r) => sum + r.responseMs, 0) / results.length
  );

  return { endpoints: results, avgResponseMs };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const nowUtc = new Date();
    const nowWib = getWibNow();
    const wibDateStr = getWibDateStr();
    const wibTimeStr = getWibTimeStr();

    // Measure database response time
    const dbHealth = await measureDbResponseTime(supabase);
    
    // Check all endpoints health
    const endpointsHealth = await checkEndpointsHealth(supabase);

    // Get school settings
    const { data: settings, error: settingsError } = await supabase
      .from('school_settings')
      .select('check_in_time, late_time, check_out_time')
      .limit(1)
      .maybeSingle();

    if (settingsError) throw settingsError;

    // Check holiday
    const { data: holiday } = await supabase
      .from('holidays')
      .select('name')
      .eq('date', wibDateStr)
      .maybeSingle();

    // Get system info for uptime
    const { data: systemInfo } = await supabase
      .from('system_info')
      .select('started_at')
      .limit(1)
      .maybeSingle();

    // Calculate uptime
    let uptimeMs = 0;
    let uptimeFormatted = 'Tidak tersedia';
    if (systemInfo?.started_at) {
      const startedAt = new Date(systemInfo.started_at);
      uptimeMs = nowUtc.getTime() - startedAt.getTime();
      uptimeFormatted = formatDuration(uptimeMs);
    }

    // Get day name
    const dayOfWeek = nowWib.getDay();
    const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const currentDay = dayNames[dayOfWeek];
    const isFriday = dayOfWeek === 5;

    // Get uptime history (last 7 days)
    const sevenDaysAgo = new Date(nowUtc);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const { data: uptimeHistory } = await supabase
      .from('uptime_history')
      .select('*')
      .gte('checked_at', sevenDaysAgo.toISOString())
      .order('checked_at', { ascending: true });

    // Determine overall health
    const isHealthy = dbHealth.success && 
      endpointsHealth.endpoints.every(e => e.status !== 'error');

    // Save current status to uptime_history
    await supabase.from('uptime_history').insert({
      is_healthy: isHealthy,
      database_response_ms: dbHealth.time,
      api_response_ms: endpointsHealth.avgResponseMs,
      details: {
        endpoints: endpointsHealth.endpoints,
        db_success: dbHealth.success,
      },
    });

    const payload = {
      ok: isHealthy,
      server_time_utc: nowUtc.toISOString(),
      server_time_wib: `${wibDateStr}T${wibTimeStr}:00+07:00`,
      wib_date: wibDateStr,
      wib_time: wibTimeStr,
      wib_day: currentDay,
      is_friday: isFriday,
      is_holiday: !!holiday,
      holiday_name: holiday?.name || null,
      uptime: {
        started_at: systemInfo?.started_at || null,
        duration_ms: uptimeMs,
        formatted: uptimeFormatted,
      },
      response_times: {
        database_ms: dbHealth.time,
        database_healthy: dbHealth.success,
        api_avg_ms: endpointsHealth.avgResponseMs,
        endpoints: endpointsHealth.endpoints,
      },
      uptime_history: uptimeHistory || [],
      school_settings: {
        check_in_time: settings?.check_in_time?.slice?.(0, 5) ?? '07:00',
        late_time: settings?.late_time?.slice?.(0, 5) ?? '07:30',
        check_out_time: settings?.check_out_time?.slice?.(0, 5) ?? '14:00',
      },
      cron_info: {
        note: 'Cron jobs run every hour and execute only after check_out_time on workdays (excluding Friday and holidays)',
      },
    };

    console.log('System status check completed:', {
      healthy: isHealthy,
      db_ms: dbHealth.time,
      api_avg_ms: endpointsHealth.avgResponseMs,
    });

    return new Response(JSON.stringify(payload), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('system-status error:', error);
    return new Response(JSON.stringify({ ok: false, error: error?.message ?? 'Unknown' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});