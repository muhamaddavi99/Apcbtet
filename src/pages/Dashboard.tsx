import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, BookOpen, GraduationCap, Calendar, CheckCircle2, TrendingUp, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useSchoolSettings } from '@/contexts/SchoolContext';
import TeacherDashboard from '@/components/TeacherDashboard';
import AttendanceStatsWidget from '@/components/AttendanceStatsWidget';
import { NotificationPermissionBanner } from '@/components/NotificationPermissionBanner';
import AIDashboardSummary from '@/components/AIDashboardSummary';
import { usePageTitle } from '@/hooks/usePageTitle';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalGuru: 0,
    totalSiswa: 0,
    totalKelas: 0,
    absensiHariIni: 0,
    totalJadwal: 0,
    totalMapel: 0,
  });
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [autoStatus, setAutoStatus] = useState<any>(null);
  const [attendanceStats, setAttendanceStats] = useState<any[]>([]);
  const [weeklyAttendance, setWeeklyAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const { toast } = useToast();
  const { settings } = useSchoolSettings();

  usePageTitle('Dashboard');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];
      
      // Get current user profile
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        setUserProfile(profile);
      }
      
      // Load all stats in parallel
      const [
        profilesRes,
        studentsRes,
        classesRes,
        attendanceRes,
        schedulesRes,
        subjectsRes,
        announcementsRes,
        holidayRes,
        weeklyAttendanceRes,
      ] = await Promise.all([
        supabase.from('profiles').select('role'),
        supabase.from('students').select('id'),
        supabase.from('classes').select('id'),
        supabase.from('attendance').select('status').eq('date', today),
        supabase.from('schedules').select('id'),
        supabase.from('subjects').select('id'),
        supabase.from('announcements').select('*').order('created_at', { ascending: false }).limit(5),
        supabase.from('holidays').select('*').eq('date', today).maybeSingle(),
        supabase.from('attendance').select('status, date').gte('date', getWeekStart()).lte('date', today),
      ]);

      // Check if today is Friday (day 5 in JavaScript, 0=Sunday)
      const dayOfWeek = new Date().getDay();
      const isFriday = dayOfWeek === 5;

      // Calculate stats
      const profiles = profilesRes.data || [];
      const totalGuru = profiles.filter(p => p.role === 'teacher').length;
      const totalStaff = profiles.filter(p => p.role === 'staff').length;
      
      setStats({
        totalGuru: totalGuru + totalStaff,
        totalSiswa: studentsRes.data?.length || 0,
        totalKelas: classesRes.data?.length || 0,
        absensiHariIni: attendanceRes.data?.filter(a => a.status === 'hadir').length || 0,
        totalJadwal: schedulesRes.data?.length || 0,
        totalMapel: subjectsRes.data?.length || 0,
      });

      setAnnouncements(announcementsRes.data || []);

      // Calculate attendance distribution for pie chart
      const attendanceData = attendanceRes.data || [];
      const statusCounts = {
        hadir: attendanceData.filter(a => a.status === 'hadir').length,
        izin: attendanceData.filter(a => a.status === 'izin').length,
        sakit: attendanceData.filter(a => a.status === 'sakit').length,
        alpha: attendanceData.filter(a => a.status === 'alpha').length,
      };
      
      setAttendanceStats([
        { name: 'Hadir', value: statusCounts.hadir, color: '#22c55e' },
        { name: 'Izin', value: statusCounts.izin, color: '#eab308' },
        { name: 'Sakit', value: statusCounts.sakit, color: '#3b82f6' },
        { name: 'Alpha', value: statusCounts.alpha, color: '#ef4444' },
      ]);

      // Calculate weekly attendance for line chart
      const weeklyData = weeklyAttendanceRes.data || [];
      const dailyCounts: Record<string, { hadir: number; total: number }> = {};
      
      weeklyData.forEach(att => {
        if (!dailyCounts[att.date]) {
          dailyCounts[att.date] = { hadir: 0, total: 0 };
        }
        dailyCounts[att.date].total++;
        if (att.status === 'hadir') {
          dailyCounts[att.date].hadir++;
        }
      });

      const weeklyChartData = Object.entries(dailyCounts)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, counts]) => ({
          date: new Date(date).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' }),
          hadir: counts.hadir,
          total: counts.total,
        }));
      
      setWeeklyAttendance(weeklyChartData);

      // Friday is also a holiday (Hari Jumat Libur)
      const isHoliday = holidayRes.data || isFriday;
      setAutoStatus({
        isActive: !isHoliday,
        reason: holidayRes.data 
          ? `Hari ini adalah hari libur: ${holidayRes.data.name}` 
          : isFriday 
            ? 'Hari ini adalah hari Jumat (Libur)'
            : null,
      });
    } catch (error: any) {
      console.error('Error loading dashboard:', error);
      toast({
        title: 'Error',
        description: 'Gagal memuat data dashboard',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getWeekStart = () => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date.toISOString().split('T')[0];
  };

  return (
    <Layout>
      {loading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : (
      <div className="space-y-6">
        {/* Notification Permission Banner */}
        <NotificationPermissionBanner />

        <div className="animate-fade-in flex items-center gap-4">
          {settings.school_icon_url && (
            <img 
              src={settings.school_icon_url} 
              alt="School Logo" 
              className="h-16 w-16 rounded-lg object-cover"
            />
          )}
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground">Selamat datang di Sistem Informasi {settings.school_name}</p>
          </div>
        </div>

        {/* AI Dashboard Summary */}
        {(userProfile?.role === 'admin' || userProfile?.role === 'staff') && (
          <AIDashboardSummary />
        )}

        {/* Attendance Stats Widget */}
        {(userProfile?.role === 'admin' || userProfile?.role === 'staff') && (
          <AttendanceStatsWidget />
        )}

        {/* Teacher Dashboard - Teaching Schedule */}
        {userProfile?.role === 'teacher' && (
          <TeacherDashboard userId={userProfile.id} />
        )}

        {/* Status Absensi Otomatis - Check weekend and holidays */}
        {autoStatus && (
          <Card className={`border-l-4 animate-fade-up ${autoStatus.isActive ? 'border-l-green-500' : 'border-l-destructive'}`}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <CheckCircle2 className={`h-6 w-6 ${autoStatus.isActive ? 'text-green-500' : 'text-destructive'}`} />
                <div>
                  <p className="font-semibold">
                    Status Absensi: {autoStatus.isActive ? 'Telah Aktif' : 'Hari Libur'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {autoStatus.isActive 
                      ? 'Sistem absensi sedang berjalan normal'
                      : autoStatus.reason || 'Hari ini adalah hari libur'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="animate-scale-in hover-scale" style={{ animationDelay: '0.1s' }}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Guru & Staf</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalGuru}</div>
              <p className="text-xs text-muted-foreground">Guru dan staf aktif</p>
            </CardContent>
          </Card>

          <Card className="animate-scale-in hover-scale" style={{ animationDelay: '0.2s' }}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Siswa</CardTitle>
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalSiswa}</div>
              <p className="text-xs text-muted-foreground">Siswa aktif</p>
            </CardContent>
          </Card>

          <Card className="animate-scale-in hover-scale" style={{ animationDelay: '0.3s' }}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Kelas</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalKelas}</div>
              <p className="text-xs text-muted-foreground">Kelas aktif</p>
            </CardContent>
          </Card>

          <Card className="animate-scale-in hover-scale" style={{ animationDelay: '0.4s' }}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Hadir Hari Ini</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.absensiHariIni}</div>
              <p className="text-xs text-muted-foreground">Guru & staf hadir</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Weekly Attendance Chart */}
          <Card className="animate-fade-up" style={{ animationDelay: '0.5s' }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Kehadiran 7 Hari Terakhir
              </CardTitle>
            </CardHeader>
            <CardContent>
              {weeklyAttendance.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={weeklyAttendance}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="hadir" 
                      stroke="#22c55e" 
                      strokeWidth={2}
                      dot={{ fill: '#22c55e', strokeWidth: 2 }}
                      name="Hadir"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="total" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      dot={{ fill: '#3b82f6', strokeWidth: 2 }}
                      name="Total"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                  Belum ada data kehadiran minggu ini
                </div>
              )}
            </CardContent>
          </Card>

          {/* Attendance Distribution Pie Chart */}
          <Card className="animate-fade-up" style={{ animationDelay: '0.6s' }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Distribusi Kehadiran Hari Ini
              </CardTitle>
            </CardHeader>
            <CardContent>
              {attendanceStats.some(s => s.value > 0) ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={attendanceStats}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {attendanceStats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                  Belum ada data kehadiran hari ini
                </div>
              )}
              <div className="flex justify-center gap-4 mt-4 flex-wrap">
                {attendanceStats.map((stat) => (
                  <div key={stat.name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stat.color }} />
                    <span className="text-sm text-muted-foreground">{stat.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pengumuman Terbaru */}
        <Card className="animate-fade-up" style={{ animationDelay: '0.7s' }}>
          <CardHeader>
            <CardTitle>Pengumuman Terbaru</CardTitle>
          </CardHeader>
          <CardContent>
            {announcements.length > 0 ? (
              <div className="space-y-4">
                {announcements.map((announcement, index) => (
                  <div
                    key={announcement.id}
                    className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-accent/50 transition-all duration-300 hover:scale-[1.02] hover:shadow-md animate-fade-in"
                    style={{ animationDelay: `${0.8 + index * 0.1}s` }}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{announcement.title}</h3>
                        {announcement.priority === 'high' && (
                          <span className="px-2 py-0.5 text-xs bg-red-500/10 text-red-600 rounded-full">
                            Penting
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {announcement.content}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(announcement.created_at).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">Belum ada pengumuman</p>
            )}
          </CardContent>
        </Card>
      </div>
      )}
    </Layout>
  );
}
