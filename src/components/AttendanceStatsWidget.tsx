import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Users, CalendarDays, Calendar, TrendingUp, Loader2 } from 'lucide-react';

interface StatsData {
  todayTeacher: { hadir: number; total: number };
  todayStudent: { hadir: number; total: number };
  weekTeacher: { hadir: number; total: number };
  weekStudent: { hadir: number; total: number };
  monthTeacher: { hadir: number; total: number };
  monthStudent: { hadir: number; total: number };
}

export default function AttendanceStatsWidget() {
  const [stats, setStats] = useState<StatsData>({
    todayTeacher: { hadir: 0, total: 0 },
    todayStudent: { hadir: 0, total: 0 },
    weekTeacher: { hadir: 0, total: 0 },
    weekStudent: { hadir: 0, total: 0 },
    monthTeacher: { hadir: 0, total: 0 },
    monthStudent: { hadir: 0, total: 0 },
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const weekStart = getWeekStart();
      const monthStart = getMonthStart();

      // Load all stats in parallel
      const [
        todayTeacherRes,
        todayStudentRes,
        weekTeacherRes,
        weekStudentRes,
        monthTeacherRes,
        monthStudentRes,
        totalTeachersRes,
        totalStudentsRes,
      ] = await Promise.all([
        // Today - Teacher
        supabase.from('attendance').select('status').eq('date', today),
        // Today - Student
        supabase.from('student_attendance').select('status').eq('date', today),
        // Week - Teacher
        supabase.from('attendance').select('status').gte('date', weekStart).lte('date', today),
        // Week - Student
        supabase.from('student_attendance').select('status').gte('date', weekStart).lte('date', today),
        // Month - Teacher
        supabase.from('attendance').select('status').gte('date', monthStart).lte('date', today),
        // Month - Student
        supabase.from('student_attendance').select('status').gte('date', monthStart).lte('date', today),
        // Total Teachers
        supabase.from('profiles').select('id').in('role', ['teacher', 'staff']),
        // Total Students
        supabase.from('students').select('id'),
      ]);

      const countHadir = (data: any[]) => data?.filter(r => r.status === 'hadir' || r.status === 'late').length || 0;

      setStats({
        todayTeacher: { 
          hadir: countHadir(todayTeacherRes.data || []), 
          total: totalTeachersRes.data?.length || 0 
        },
        todayStudent: { 
          hadir: countHadir(todayStudentRes.data || []), 
          total: totalStudentsRes.data?.length || 0 
        },
        weekTeacher: { 
          hadir: countHadir(weekTeacherRes.data || []), 
          total: weekTeacherRes.data?.length || 0 
        },
        weekStudent: { 
          hadir: countHadir(weekStudentRes.data || []), 
          total: weekStudentRes.data?.length || 0 
        },
        monthTeacher: { 
          hadir: countHadir(monthTeacherRes.data || []), 
          total: monthTeacherRes.data?.length || 0 
        },
        monthStudent: { 
          hadir: countHadir(monthStudentRes.data || []), 
          total: monthStudentRes.data?.length || 0 
        },
      });
    } catch (error) {
      console.error('Error loading attendance stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getWeekStart = () => {
    const date = new Date();
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    date.setDate(diff);
    return date.toISOString().split('T')[0];
  };

  const getMonthStart = () => {
    const date = new Date();
    date.setDate(1);
    return date.toISOString().split('T')[0];
  };

  const getPercentage = (hadir: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((hadir / total) * 100);
  };

  if (loading) {
    return (
      <Card className="animate-fade-up">
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="animate-fade-up">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Ringkasan Kehadiran
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          {/* Today */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Calendar className="h-4 w-4" />
              Hari Ini
            </div>
            <div className="space-y-2">
              <div className="p-3 bg-primary/5 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Guru</span>
                  <span className="font-bold text-green-600">
                    {stats.todayTeacher.hadir}/{stats.todayTeacher.total}
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2 mt-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full transition-all"
                    style={{ width: `${getPercentage(stats.todayTeacher.hadir, stats.todayTeacher.total)}%` }}
                  />
                </div>
              </div>
              <div className="p-3 bg-primary/5 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Siswa</span>
                  <span className="font-bold text-blue-600">
                    {stats.todayStudent.hadir}/{stats.todayStudent.total}
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2 mt-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all"
                    style={{ width: `${getPercentage(stats.todayStudent.hadir, stats.todayStudent.total)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* This Week */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <CalendarDays className="h-4 w-4" />
              Minggu Ini
            </div>
            <div className="space-y-2">
              <div className="p-3 bg-primary/5 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Guru</span>
                  <span className="font-bold text-green-600">
                    {getPercentage(stats.weekTeacher.hadir, stats.weekTeacher.total)}%
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.weekTeacher.hadir} hadir dari {stats.weekTeacher.total}
                </p>
              </div>
              <div className="p-3 bg-primary/5 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Siswa</span>
                  <span className="font-bold text-blue-600">
                    {getPercentage(stats.weekStudent.hadir, stats.weekStudent.total)}%
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.weekStudent.hadir} hadir dari {stats.weekStudent.total}
                </p>
              </div>
            </div>
          </div>

          {/* This Month */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Users className="h-4 w-4" />
              Bulan Ini
            </div>
            <div className="space-y-2">
              <div className="p-3 bg-primary/5 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Guru</span>
                  <span className="font-bold text-green-600">
                    {getPercentage(stats.monthTeacher.hadir, stats.monthTeacher.total)}%
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.monthTeacher.hadir} hadir dari {stats.monthTeacher.total}
                </p>
              </div>
              <div className="p-3 bg-primary/5 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Siswa</span>
                  <span className="font-bold text-blue-600">
                    {getPercentage(stats.monthStudent.hadir, stats.monthStudent.total)}%
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.monthStudent.hadir} hadir dari {stats.monthStudent.total}
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
