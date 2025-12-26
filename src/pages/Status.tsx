import { useEffect, useMemo, useState } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { usePageTitle } from '@/hooks/usePageTitle';
import { Activity, Calendar, Clock, Database, RefreshCw, Server, Timer, Shield, ArrowUp, Zap, BarChart3 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { format, parseISO } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

type EndpointStatus = {
  name: string;
  responseMs: number;
  status: 'ok' | 'slow' | 'error';
};

type UptimeHistoryEntry = {
  id: string;
  checked_at: string;
  is_healthy: boolean;
  database_response_ms: number | null;
  api_response_ms: number | null;
  details: any;
};

type StatusPayload = {
  ok: boolean;
  server_time_utc: string;
  server_time_wib: string;
  wib_date: string;
  wib_time: string;
  wib_day: string;
  is_friday: boolean;
  is_holiday: boolean;
  holiday_name: string | null;
  uptime: {
    started_at: string | null;
    duration_ms: number;
    formatted: string;
  };
  response_times: {
    database_ms: number;
    database_healthy: boolean;
    api_avg_ms: number;
    endpoints: EndpointStatus[];
  };
  uptime_history: UptimeHistoryEntry[];
  school_settings: {
    check_in_time: string;
    late_time: string;
    check_out_time: string;
  };
  cron_info: {
    note: string;
  };
};

export default function Status() {
  usePageTitle('Status Sistem');
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<StatusPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: respData, error: respError } = await supabase.functions.invoke('system-status');
      if (respError) throw respError;
      setData(respData as StatusPayload);
    } catch (e: any) {
      const msg = e?.message || 'Terjadi kesalahan saat memeriksa status sistem.';
      setError(msg);
      toast({
        title: 'Gagal memuat status',
        description: msg,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const t = window.setInterval(load, 30_000);
    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const health = useMemo(() => {
    if (error) return { label: 'Error', variant: 'destructive' as const };
    if (!data) return { label: 'Memuat...', variant: 'secondary' as const };
    return data.ok
      ? { label: 'Normal', variant: 'default' as const }
      : { label: 'Bermasalah', variant: 'destructive' as const };
  }, [data, error]);

  const dayStatus = useMemo(() => {
    if (!data) return null;
    if (data.is_holiday) return { label: `Libur: ${data.holiday_name}`, variant: 'secondary' as const };
    if (data.is_friday) return { label: 'Jumat (Libur Absensi)', variant: 'outline' as const };
    return { label: 'Hari Kerja', variant: 'default' as const };
  }, [data]);

  // Prepare chart data for uptime history
  const chartData = useMemo(() => {
    if (!data?.uptime_history) return [];
    return data.uptime_history.map((entry) => ({
      time: format(parseISO(entry.checked_at), 'dd/MM HH:mm', { locale: idLocale }),
      database: entry.database_response_ms || 0,
      api: entry.api_response_ms || 0,
      healthy: entry.is_healthy ? 1 : 0,
    }));
  }, [data?.uptime_history]);

  // Calculate uptime percentage
  const uptimePercentage = useMemo(() => {
    if (!data?.uptime_history || data.uptime_history.length === 0) return 100;
    const healthyCount = data.uptime_history.filter(h => h.is_healthy).length;
    return Math.round((healthyCount / data.uptime_history.length) * 100);
  }, [data?.uptime_history]);

  const getStatusBadge = (status: 'ok' | 'slow' | 'error') => {
    switch (status) {
      case 'ok':
        return <Badge variant="default" className="bg-green-600">OK</Badge>;
      case 'slow':
        return <Badge variant="secondary" className="bg-yellow-500 text-white">Lambat</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
    }
  };

  const getResponseTimeColor = (ms: number) => {
    if (ms < 100) return 'text-green-600';
    if (ms < 300) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Layout>
      <header className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <Server className="h-8 w-8" />
          Status Server & Database
        </h1>
        <p className="text-muted-foreground">Pantau kesehatan sistem dan jadwal otomatis (refresh tiap 30 detik)</p>
      </header>

      {/* Main Status Cards */}
      <section className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Health Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Activity className="h-4 w-4" />
              Kesehatan Sistem
            </CardTitle>
            <CardDescription>Status backend & database</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            {loading && !data ? (
              <Skeleton className="h-6 w-20" />
            ) : (
              <Badge variant={health.variant} className="text-sm">{health.label}</Badge>
            )}
            <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2">
              <RefreshCw className={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
            </Button>
          </CardContent>
        </Card>

        {/* Day Status Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4" />
              Status Hari
            </CardTitle>
            <CardDescription>{data?.wib_day ?? '-'}, {data?.wib_date ?? '-'}</CardDescription>
          </CardHeader>
          <CardContent>
            {loading && !data ? (
              <Skeleton className="h-6 w-24" />
            ) : dayStatus ? (
              <Badge variant={dayStatus.variant}>{dayStatus.label}</Badge>
            ) : (
              <span className="text-muted-foreground">-</span>
            )}
          </CardContent>
        </Card>

        {/* WIB Time Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4" />
              Waktu WIB
            </CardTitle>
            <CardDescription>Waktu server saat ini</CardDescription>
          </CardHeader>
          <CardContent>
            {loading && !data ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <span className="text-2xl font-bold font-mono">{data?.wib_time ?? '--:--'}</span>
            )}
          </CardContent>
        </Card>

        {/* Uptime Percentage Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <BarChart3 className="h-4 w-4" />
              Uptime 7 Hari
            </CardTitle>
            <CardDescription>Persentase waktu aktif</CardDescription>
          </CardHeader>
          <CardContent>
            {loading && !data ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <span className={`text-2xl font-bold ${uptimePercentage >= 99 ? 'text-green-600' : uptimePercentage >= 95 ? 'text-yellow-600' : 'text-red-600'}`}>
                {uptimePercentage}%
              </span>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Response Time Monitoring */}
      <section className="mt-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Zap className="h-4 w-4" />
              Response Time Monitoring
            </CardTitle>
            <CardDescription>Waktu respons setiap endpoint API</CardDescription>
          </CardHeader>
          <CardContent>
            {loading && !data ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {/* Summary */}
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <Database className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">Database</p>
                      <p className="text-xs text-muted-foreground">Koneksi database utama</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-lg font-bold font-mono ${getResponseTimeColor(data?.response_times?.database_ms ?? 0)}`}>
                      {data?.response_times?.database_ms ?? '-'}ms
                    </span>
                    <div>
                      {data?.response_times?.database_healthy ? (
                        <Badge variant="default" className="bg-green-600 text-xs">Healthy</Badge>
                      ) : (
                        <Badge variant="destructive" className="text-xs">Error</Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* API Average */}
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <Server className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">API Average</p>
                      <p className="text-xs text-muted-foreground">Rata-rata semua endpoint</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-lg font-bold font-mono ${getResponseTimeColor(data?.response_times?.api_avg_ms ?? 0)}`}>
                      {data?.response_times?.api_avg_ms ?? '-'}ms
                    </span>
                  </div>
                </div>

                {/* Individual Endpoints */}
                <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3 mt-4">
                  {data?.response_times?.endpoints?.map((endpoint) => (
                    <div key={endpoint.name} className="flex items-center justify-between p-2 border rounded-lg">
                      <span className="text-sm font-medium capitalize">{endpoint.name.replace('_', ' ')}</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-mono ${getResponseTimeColor(endpoint.responseMs)}`}>
                          {endpoint.responseMs}ms
                        </span>
                        {getStatusBadge(endpoint.status)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Uptime History Chart */}
      <section className="mt-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <ArrowUp className="h-4 w-4" />
              Grafik Response Time (7 Hari Terakhir)
            </CardTitle>
            <CardDescription>Riwayat waktu respons database dan API</CardDescription>
          </CardHeader>
          <CardContent>
            {loading && !data ? (
              <Skeleton className="h-64 w-full" />
            ) : chartData.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="time" 
                      tick={{ fontSize: 10 }} 
                      interval="preserveStartEnd"
                      className="text-muted-foreground"
                    />
                    <YAxis 
                      tick={{ fontSize: 10 }} 
                      label={{ value: 'ms', angle: -90, position: 'insideLeft', fontSize: 10 }}
                      className="text-muted-foreground"
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                      labelStyle={{ color: 'hsl(var(--foreground))' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="database" 
                      stroke="hsl(142, 76%, 36%)" 
                      fill="hsl(142, 76%, 36%)" 
                      fillOpacity={0.3}
                      name="Database (ms)"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="api" 
                      stroke="hsl(200, 76%, 50%)" 
                      fill="hsl(200, 76%, 50%)" 
                      fillOpacity={0.3}
                      name="API (ms)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                <p>Belum ada data riwayat. Data akan terekam setiap kali halaman ini dibuka.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Additional Cards Row */}
      <section className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Uptime Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <ArrowUp className="h-4 w-4" />
              Uptime Sistem
            </CardTitle>
            <CardDescription>Waktu aktif server</CardDescription>
          </CardHeader>
          <CardContent>
            {loading && !data ? (
              <Skeleton className="h-6 w-24" />
            ) : (
              <>
                <span className="text-lg font-bold text-green-600">{data?.uptime?.formatted ?? '-'}</span>
                {data?.uptime?.started_at && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Sejak {new Date(data.uptime.started_at).toLocaleDateString('id-ID')}
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Security Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Shield className="h-4 w-4" />
              Keamanan API
            </CardTitle>
            <CardDescription>Status proteksi</CardDescription>
          </CardHeader>
          <CardContent>
            <Badge variant="default" className="bg-green-600">Terlindungi</Badge>
            <p className="text-xs text-muted-foreground mt-1">API key tersimpan di backend</p>
          </CardContent>
        </Card>

        {/* Data Points Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <BarChart3 className="h-4 w-4" />
              Data Monitoring
            </CardTitle>
            <CardDescription>Jumlah data point</CardDescription>
          </CardHeader>
          <CardContent>
            <span className="text-lg font-bold">{data?.uptime_history?.length ?? 0}</span>
            <p className="text-xs text-muted-foreground mt-1">Data point dalam 7 hari</p>
          </CardContent>
        </Card>
      </section>

      {/* School Settings */}
      <section className="mt-6 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Database className="h-4 w-4" />
              Pengaturan Jam Sekolah
            </CardTitle>
            <CardDescription>Dari tabel school_settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Jam Masuk</span>
              {loading && !data ? (
                <Skeleton className="h-5 w-12" />
              ) : (
                <span className="font-medium font-mono">{data?.school_settings.check_in_time ?? '-'}</span>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Jam Terlambat</span>
              {loading && !data ? (
                <Skeleton className="h-5 w-12" />
              ) : (
                <span className="font-medium font-mono">{data?.school_settings.late_time ?? '-'}</span>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Jam Pulang</span>
              {loading && !data ? (
                <Skeleton className="h-5 w-12" />
              ) : (
                <span className="font-medium font-mono">{data?.school_settings.check_out_time ?? '-'}</span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Timer className="h-4 w-4" />
              Info Cron Jobs
            </CardTitle>
            <CardDescription>Jadwal otomatis sistem</CardDescription>
          </CardHeader>
          <CardContent className="text-sm space-y-3">
            <div className="p-3 bg-muted rounded-lg">
              <p className="font-medium">Auto Alpha & Mark Not Teaching</p>
              <p className="text-muted-foreground text-xs mt-1">
                {data?.cron_info.note ?? 'Cron berjalan setiap jam setelah jam pulang pada hari kerja'}
              </p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Jam Pulang Aktif</span>
                <span className="font-mono">{data?.school_settings.check_out_time ?? '-'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Skip Jumat</span>
                <Badge variant="outline">Ya</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Skip Hari Libur</span>
                <Badge variant="outline">Ya</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Server Time Debug */}
      <section className="mt-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Debug Waktu Server</CardTitle>
            <CardDescription>Untuk memverifikasi zona waktu berjalan dengan benar</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 text-sm">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Server UTC</span>
                {loading && !data ? (
                  <Skeleton className="h-5 w-40" />
                ) : (
                  <span className="font-mono text-xs">{data?.server_time_utc ?? '-'}</span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Server WIB</span>
                {loading && !data ? (
                  <Skeleton className="h-5 w-40" />
                ) : (
                  <span className="font-mono text-xs">{data?.server_time_wib ?? '-'}</span>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Hari</span>
                <span className="font-medium">{data?.wib_day ?? '-'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Tanggal WIB</span>
                <span className="font-mono">{data?.wib_date ?? '-'}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </Layout>
  );
}