import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Sparkles, RefreshCw, TrendingUp, Users, Calendar, AlertTriangle, CheckCircle } from 'lucide-react';

const AI_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-assistant`;

interface DailySummary {
  summary: string;
  stats: {
    totalTeachers: number;
    hadir: number;
    izin: number;
    sakit: number;
    alpha: number;
    attendanceRate: number;
  };
  insights: string[];
  recommendations: string[];
}

export default function AIDashboardSummary() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [aiInsight, setAiInsight] = useState('');

  useEffect(() => {
    loadDailySummary();
  }, []);

  const loadDailySummary = async () => {
    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];

      // Fetch data in parallel
      const [attendanceRes, teachersRes, holidayRes, schedulesRes, sessionsRes] = await Promise.all([
        supabase.from('attendance').select('status').eq('date', today),
        supabase.from('profiles').select('id').in('role', ['teacher', 'staff']),
        supabase.from('holidays').select('name').eq('date', today).maybeSingle(),
        supabase.from('schedules').select('id').eq('day', getDayName()),
        supabase.from('teaching_sessions').select('id, status').gte('start_time', today),
      ]);

      const attendance = attendanceRes.data || [];
      const totalTeachers = teachersRes.data?.length || 0;

      const stats = {
        totalTeachers,
        hadir: attendance.filter(a => a.status === 'hadir').length,
        izin: attendance.filter(a => a.status === 'izin').length,
        sakit: attendance.filter(a => a.status === 'sakit').length,
        alpha: attendance.filter(a => a.status === 'alpha').length,
        attendanceRate: totalTeachers > 0 
          ? Math.round((attendance.filter(a => a.status === 'hadir').length / totalTeachers) * 100) 
          : 0,
      };

      // Generate insights locally first
      const insights: string[] = [];
      const recommendations: string[] = [];

      if (holidayRes.data) {
        insights.push(`📅 Hari ini adalah hari libur: ${holidayRes.data.name}`);
      } else {
        if (stats.attendanceRate >= 90) {
          insights.push('✅ Tingkat kehadiran sangat baik (≥90%)');
        } else if (stats.attendanceRate >= 75) {
          insights.push('⚠️ Tingkat kehadiran cukup baik (75-90%)');
        } else if (stats.attendanceRate > 0) {
          insights.push('🔴 Tingkat kehadiran rendah (<75%)');
          recommendations.push('Perlu evaluasi penyebab rendahnya kehadiran');
        }

        if (stats.alpha > 0) {
          insights.push(`⚠️ Ada ${stats.alpha} guru/staf tidak hadir tanpa keterangan`);
          recommendations.push('Hubungi guru yang alpha untuk konfirmasi');
        }

        if (stats.sakit > 2) {
          insights.push(`🏥 ${stats.sakit} guru/staf sakit - perlu perhatian`);
        }
      }

      const summaryText = holidayRes.data 
        ? `Hari ini adalah hari libur (${holidayRes.data.name}). Tidak ada absensi yang dicatat.`
        : `Dari ${totalTeachers} guru/staf, ${stats.hadir} hadir (${stats.attendanceRate}%), ${stats.izin} izin, ${stats.sakit} sakit, dan ${stats.alpha} alpha.`;

      setSummary({
        summary: summaryText,
        stats,
        insights,
        recommendations,
      });

      // Fetch AI insight if not a holiday
      if (!holidayRes.data && totalTeachers > 0) {
        fetchAIInsight(stats);
      }
    } catch (error) {
      console.error('Error loading summary:', error);
      toast({
        title: 'Error',
        description: 'Gagal memuat ringkasan harian',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAIInsight = async (stats: DailySummary['stats']) => {
    try {
      const prompt = `Berikan analisis singkat (2-3 kalimat) tentang data kehadiran hari ini:
- Total guru/staf: ${stats.totalTeachers}
- Hadir: ${stats.hadir} (${stats.attendanceRate}%)
- Izin: ${stats.izin}
- Sakit: ${stats.sakit}
- Alpha: ${stats.alpha}

Fokus pada insight yang actionable dan rekomendasi singkat.`;

      const resp = await fetch(AI_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: prompt }],
          type: 'analyze',
        }),
      });

      if (!resp.ok || !resp.body) return;

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let content = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              content += delta;
              setAiInsight(content);
            }
          } catch {}
        }
      }
    } catch (error) {
      console.error('AI insight error:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setAiInsight('');
    await loadDailySummary();
    setRefreshing(false);
  };

  const getDayName = () => {
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    return days[new Date().getDay()];
  };

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <div className="grid grid-cols-4 gap-4">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20 overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">AI Ringkasan Harian</CardTitle>
              <CardDescription className="text-sm">
                {new Date().toLocaleDateString('id-ID', { 
                  weekday: 'long', 
                  day: 'numeric', 
                  month: 'long', 
                  year: 'numeric' 
                })}
              </CardDescription>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-green-500/10 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-green-600">{summary?.stats.hadir || 0}</div>
            <div className="text-xs text-muted-foreground">Hadir</div>
          </div>
          <div className="bg-yellow-500/10 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-yellow-600">{summary?.stats.izin || 0}</div>
            <div className="text-xs text-muted-foreground">Izin</div>
          </div>
          <div className="bg-blue-500/10 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-blue-600">{summary?.stats.sakit || 0}</div>
            <div className="text-xs text-muted-foreground">Sakit</div>
          </div>
          <div className="bg-red-500/10 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-red-600">{summary?.stats.alpha || 0}</div>
            <div className="text-xs text-muted-foreground">Alpha</div>
          </div>
        </div>

        {/* Attendance Rate */}
        <div className="bg-background/50 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Tingkat Kehadiran</span>
            <Badge variant={summary?.stats.attendanceRate! >= 75 ? 'default' : 'destructive'}>
              {summary?.stats.attendanceRate || 0}%
            </Badge>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 ${
                summary?.stats.attendanceRate! >= 90 ? 'bg-green-500' :
                summary?.stats.attendanceRate! >= 75 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${summary?.stats.attendanceRate || 0}%` }}
            />
          </div>
        </div>

        {/* Insights */}
        {summary?.insights && summary.insights.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <TrendingUp className="h-4 w-4 text-primary" />
              Insights
            </div>
            <div className="space-y-1">
              {summary.insights.map((insight, i) => (
                <div key={i} className="text-sm text-muted-foreground bg-background/50 rounded px-3 py-1.5">
                  {insight}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Insight */}
        {aiInsight && (
          <div className="bg-primary/5 rounded-lg p-3 border border-primary/10">
            <div className="flex items-start gap-2">
              <Sparkles className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <div className="text-sm">{aiInsight}</div>
            </div>
          </div>
        )}

        {/* Recommendations */}
        {summary?.recommendations && summary.recommendations.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Rekomendasi
            </div>
            <div className="space-y-1">
              {summary.recommendations.map((rec, i) => (
                <div key={i} className="text-sm text-muted-foreground bg-amber-500/5 border border-amber-500/10 rounded px-3 py-1.5">
                  {rec}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
