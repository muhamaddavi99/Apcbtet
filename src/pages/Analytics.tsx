import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { usePageTitle } from '@/hooks/usePageTitle';
import { 
  BarChart3, 
  PieChart, 
  Download, 
  Users, 
  UserCheck, 
  UserX, 
  Calendar,
  TrendingUp,
  FileSpreadsheet,
  FileText,
  Image,
  AlertTriangle
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { exportAnalyticsToPDF } from '@/utils/exportPDF';
import { exportChartToPNG } from '@/utils/exportChartImage';
import { useSchoolSettings } from '@/contexts/SchoolContext';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
} from 'recharts';
import * as XLSX from 'xlsx';

const COLORS = ['#22c55e', '#eab308', '#3b82f6', '#ef4444'];
const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

interface AttendanceStats {
  hadir: number;
  izin: number;
  sakit: number;
  alpha: number;
  total: number;
}

interface MonthlyData {
  month: string;
  hadir: number;
  izin: number;
  sakit: number;
  alpha: number;
}

interface ClassData {
  name: string;
  hadir: number;
  total: number;
  percentage: number;
}

export default function Analytics() {
  usePageTitle('Analytics & Laporan');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>(String(new Date().getMonth() + 1));
  const [selectedYear, setSelectedYear] = useState<string>(String(new Date().getFullYear()));
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [classes, setClasses] = useState<any[]>([]);
  const [studentStats, setStudentStats] = useState<AttendanceStats>({ hadir: 0, izin: 0, sakit: 0, alpha: 0, total: 0 });
  const [teacherStats, setTeacherStats] = useState<AttendanceStats>({ hadir: 0, izin: 0, sakit: 0, alpha: 0, total: 0 });
  const [monthlyStudentData, setMonthlyStudentData] = useState<MonthlyData[]>([]);
  const [monthlyTeacherData, setMonthlyTeacherData] = useState<MonthlyData[]>([]);
  const [classData, setClassData] = useState<ClassData[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<string>('');
  const { toast } = useToast();
  const { settings } = useSchoolSettings();

  const handleExportPDF = async () => {
    setExporting('pdf');
    try {
      await exportAnalyticsToPDF(
        {
          studentMonthly: monthlyStudentData,
          teacherMonthly: monthlyTeacherData,
          classData,
          studentStats,
          teacherStats,
        },
        selectedMonth,
        selectedYear,
        {
          name: settings.school_name,
          address: settings.school_address,
          phone: settings.school_phone,
        }
      );
      toast({ title: 'Berhasil', description: 'Laporan PDF berhasil diunduh' });
    } catch (error) {
      toast({ title: 'Error', description: 'Gagal export PDF', variant: 'destructive' });
    } finally {
      setExporting('');
    }
  };

  const handleExportChartPNG = async (chartId: string, chartName: string) => {
    setExporting(chartId);
    try {
      await exportChartToPNG(chartId, `${chartName}_${MONTHS[parseInt(selectedMonth) - 1]}_${selectedYear}`);
      toast({ title: 'Berhasil', description: 'Grafik berhasil diunduh sebagai PNG' });
    } catch (error) {
      toast({ title: 'Error', description: 'Gagal export grafik', variant: 'destructive' });
    } finally {
      setExporting('');
    }
  };

  useEffect(() => {
    loadClasses();
    loadAllData();
  }, []);

  useEffect(() => {
    loadAllData();
  }, [selectedClass, selectedMonth, selectedYear]);

  const loadClasses = async () => {
    const { data } = await supabase.from('classes').select('*').order('name');
    setClasses(data || []);
  };

  const loadAllData = async () => {
    setLoading(true);
    await Promise.all([
      loadStudentStats(),
      loadTeacherStats(),
      loadMonthlyStudentData(),
      loadMonthlyTeacherData(),
      loadClassData(),
    ]);
    setLoading(false);
  };

  const loadStudentStats = async () => {
    try {
      const year = parseInt(selectedYear);
      const month = parseInt(selectedMonth);
      const startOfMonth = new Date(year, month - 1, 1).toISOString().split('T')[0];
      const endOfMonth = new Date(year, month, 0).toISOString().split('T')[0];

      let query = supabase
        .from('student_attendance')
        .select('status')
        .gte('date', startOfMonth)
        .lte('date', endOfMonth);

      if (selectedClass !== 'all') {
        query = query.eq('class_id', selectedClass);
      }

      const { data, error } = await query;

      if (error) throw error;

      const stats = { hadir: 0, izin: 0, sakit: 0, alpha: 0, total: data?.length || 0 };
      data?.forEach(record => {
        if (record.status === 'hadir') stats.hadir++;
        else if (record.status === 'izin') stats.izin++;
        else if (record.status === 'sakit') stats.sakit++;
        else stats.alpha++;
      });

      setStudentStats(stats);
    } catch (error: any) {
      console.error('Error loading student stats:', error);
    }
  };

  const loadTeacherStats = async () => {
    try {
      const year = parseInt(selectedYear);
      const month = parseInt(selectedMonth);
      const startOfMonth = new Date(year, month - 1, 1).toISOString().split('T')[0];
      const endOfMonth = new Date(year, month, 0).toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('attendance')
        .select('status')
        .gte('date', startOfMonth)
        .lte('date', endOfMonth);

      if (error) throw error;

      const stats = { hadir: 0, izin: 0, sakit: 0, alpha: 0, total: data?.length || 0 };
      data?.forEach(record => {
        if (record.status === 'hadir' || record.status === 'late') stats.hadir++;
        else if (record.status === 'izin') stats.izin++;
        else if (record.status === 'sakit') stats.sakit++;
        else stats.alpha++;
      });

      setTeacherStats(stats);
    } catch (error: any) {
      console.error('Error loading teacher stats:', error);
    }
  };

  const loadMonthlyStudentData = async () => {
    try {
      const year = parseInt(selectedYear);
      const monthlyData: MonthlyData[] = [];

      // Load all holidays for the year
      const startOfYear = new Date(year, 0, 1).toISOString().split('T')[0];
      const endOfYear = new Date(year, 11, 31).toISOString().split('T')[0];
      const { data: holidays } = await supabase
        .from('holidays')
        .select('date')
        .gte('date', startOfYear)
        .lte('date', endOfYear);
      
      const holidayDates = new Set(holidays?.map(h => h.date) || []);

      for (let month = 1; month <= 12; month++) {
        const startOfMonth = new Date(year, month - 1, 1).toISOString().split('T')[0];
        const endOfMonth = new Date(year, month, 0).toISOString().split('T')[0];

        let query = supabase
          .from('student_attendance')
          .select('status, date')
          .gte('date', startOfMonth)
          .lte('date', endOfMonth);

        if (selectedClass !== 'all') {
          query = query.eq('class_id', selectedClass);
        }

        const { data } = await query;

        const stats = { hadir: 0, izin: 0, sakit: 0, alpha: 0 };
        data?.forEach(record => {
          // Skip holidays and Fridays from counting
          const recordDate = new Date(record.date);
          const isFriday = recordDate.getDay() === 5;
          const isHoliday = holidayDates.has(record.date);
          
          if (isFriday || isHoliday) return; // Skip this record
          
          if (record.status === 'hadir') stats.hadir++;
          else if (record.status === 'izin') stats.izin++;
          else if (record.status === 'sakit') stats.sakit++;
          else stats.alpha++;
        });

        monthlyData.push({
          month: MONTHS[month - 1].substring(0, 3),
          ...stats,
        });
      }

      setMonthlyStudentData(monthlyData);
    } catch (error: any) {
      console.error('Error loading monthly data:', error);
    }
  };

  const loadMonthlyTeacherData = async () => {
    try {
      const year = parseInt(selectedYear);
      const monthlyData: MonthlyData[] = [];

      // Load all holidays for the year
      const startOfYear = new Date(year, 0, 1).toISOString().split('T')[0];
      const endOfYear = new Date(year, 11, 31).toISOString().split('T')[0];
      const { data: holidays } = await supabase
        .from('holidays')
        .select('date')
        .gte('date', startOfYear)
        .lte('date', endOfYear);
      
      const holidayDates = new Set(holidays?.map(h => h.date) || []);

      for (let month = 1; month <= 12; month++) {
        const startOfMonth = new Date(year, month - 1, 1).toISOString().split('T')[0];
        const endOfMonth = new Date(year, month, 0).toISOString().split('T')[0];

        const { data } = await supabase
          .from('attendance')
          .select('status, date')
          .gte('date', startOfMonth)
          .lte('date', endOfMonth);

        const stats = { hadir: 0, izin: 0, sakit: 0, alpha: 0 };
        data?.forEach(record => {
          // Skip holidays and Fridays from counting
          const recordDate = new Date(record.date);
          const isFriday = recordDate.getDay() === 5;
          const isHoliday = holidayDates.has(record.date);
          
          if (isFriday || isHoliday) return; // Skip this record
          
          if (record.status === 'hadir' || record.status === 'late') stats.hadir++;
          else if (record.status === 'izin') stats.izin++;
          else if (record.status === 'sakit') stats.sakit++;
          else stats.alpha++;
        });

        monthlyData.push({
          month: MONTHS[month - 1].substring(0, 3),
          ...stats,
        });
      }

      setMonthlyTeacherData(monthlyData);
    } catch (error: any) {
      console.error('Error loading monthly teacher data:', error);
    }
  };

  const loadClassData = async () => {
    try {
      const year = parseInt(selectedYear);
      const month = parseInt(selectedMonth);
      const startOfMonth = new Date(year, month - 1, 1).toISOString().split('T')[0];
      const endOfMonth = new Date(year, month, 0).toISOString().split('T')[0];

      const { data: classesData } = await supabase.from('classes').select('id, name');
      const classStats: ClassData[] = [];

      for (const kelas of classesData || []) {
        const { data } = await supabase
          .from('student_attendance')
          .select('status')
          .eq('class_id', kelas.id)
          .gte('date', startOfMonth)
          .lte('date', endOfMonth);

        const hadir = data?.filter(r => r.status === 'hadir').length || 0;
        const total = data?.length || 0;
        const percentage = total > 0 ? Math.round((hadir / total) * 100) : 0;

        classStats.push({
          name: kelas.name,
          hadir,
          total,
          percentage,
        });
      }

      setClassData(classStats.sort((a, b) => b.percentage - a.percentage));
    } catch (error: any) {
      console.error('Error loading class data:', error);
    }
  };

  const exportStudentAttendance = async () => {
    if (!startDate || !endDate) {
      toast({ title: 'Error', description: 'Pilih tanggal mulai dan selesai', variant: 'destructive' });
      return;
    }

    setExporting('student');
    try {
      let query = supabase
        .from('student_attendance')
        .select('*, students(name, nis), classes(name)')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false });

      if (selectedClass !== 'all') {
        query = query.eq('class_id', selectedClass);
      }

      const { data, error } = await query;
      if (error) throw error;

      const exportData = data?.map((record, index) => ({
        'No': index + 1,
        'Tanggal': new Date(record.date).toLocaleDateString('id-ID'),
        'NIS': record.students?.nis || '-',
        'Nama Siswa': record.students?.name || '-',
        'Kelas': record.classes?.name || '-',
        'Status': record.status === 'hadir' ? 'Hadir' : 
                  record.status === 'izin' ? 'Izin' : 
                  record.status === 'sakit' ? 'Sakit' : 'Alpha',
        'Keterangan': record.notes || '-',
      }));

      const ws = XLSX.utils.json_to_sheet(exportData || []);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Absensi Siswa');
      XLSX.writeFile(wb, `Absensi_Siswa_${startDate}_${endDate}.xlsx`);

      toast({ title: 'Berhasil', description: 'File Excel berhasil diunduh' });
    } catch (error: any) {
      toast({ title: 'Error', description: 'Gagal export data', variant: 'destructive' });
    } finally {
      setExporting('');
    }
  };

  const exportTeacherAttendance = async () => {
    if (!startDate || !endDate) {
      toast({ title: 'Error', description: 'Pilih tanggal mulai dan selesai', variant: 'destructive' });
      return;
    }

    setExporting('teacher');
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select('*, profiles(full_name, nip)')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false });

      if (error) throw error;

      const exportData = data?.map((record, index) => ({
        'No': index + 1,
        'Tanggal': new Date(record.date).toLocaleDateString('id-ID'),
        'NIP': record.profiles?.nip || '-',
        'Nama Guru': record.profiles?.full_name || '-',
        'Jam Masuk': record.check_in || '-',
        'Jam Keluar': record.check_out || '-',
        'Status': record.status === 'hadir' ? 'Hadir' : 
                  record.status === 'late' ? 'Terlambat' :
                  record.status === 'izin' ? 'Izin' : 
                  record.status === 'sakit' ? 'Sakit' : 'Alpha',
      }));

      const ws = XLSX.utils.json_to_sheet(exportData || []);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Absensi Guru');
      XLSX.writeFile(wb, `Absensi_Guru_${startDate}_${endDate}.xlsx`);

      toast({ title: 'Berhasil', description: 'File Excel berhasil diunduh' });
    } catch (error: any) {
      toast({ title: 'Error', description: 'Gagal export data', variant: 'destructive' });
    } finally {
      setExporting('');
    }
  };

  const exportStudentGrades = async () => {
    if (!startDate || !endDate) {
      toast({ title: 'Error', description: 'Pilih tanggal mulai dan selesai', variant: 'destructive' });
      return;
    }

    setExporting('grades');
    try {
      let query = supabase
        .from('student_grades')
        .select('*, students(name, nis), classes(name), subjects(name)')
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .order('created_at', { ascending: false });

      if (selectedClass !== 'all') {
        query = query.eq('class_id', selectedClass);
      }

      const { data, error } = await query;
      if (error) throw error;

      const exportData = data?.map((record, index) => ({
        'No': index + 1,
        'NIS': record.students?.nis || '-',
        'Nama Siswa': record.students?.name || '-',
        'Kelas': record.classes?.name || '-',
        'Mata Pelajaran': record.subjects?.name || '-',
        'Jenis Nilai': record.grade_type,
        'Nilai': record.grade_value,
        'Semester': record.semester,
        'Tahun Ajaran': record.academic_year,
        'Keterangan': record.description || '-',
      }));

      const ws = XLSX.utils.json_to_sheet(exportData || []);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Nilai Siswa');
      XLSX.writeFile(wb, `Nilai_Siswa_${startDate}_${endDate}.xlsx`);

      toast({ title: 'Berhasil', description: 'File Excel berhasil diunduh' });
    } catch (error: any) {
      toast({ title: 'Error', description: 'Gagal export data', variant: 'destructive' });
    } finally {
      setExporting('');
    }
  };

  const pieData = [
    { name: 'Hadir', value: studentStats.hadir },
    { name: 'Izin', value: studentStats.izin },
    { name: 'Sakit', value: studentStats.sakit },
    { name: 'Alpha', value: studentStats.alpha },
  ];

  const teacherPieData = [
    { name: 'Hadir', value: teacherStats.hadir },
    { name: 'Izin', value: teacherStats.izin },
    { name: 'Sakit', value: teacherStats.sakit },
    { name: 'Alpha', value: teacherStats.alpha },
  ];

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">Analytics & Laporan</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Statistik kehadiran dan export laporan</p>
          </div>
          <Button onClick={handleExportPDF} disabled={exporting === 'pdf'} size="sm" className="text-xs sm:text-sm gap-1 sm:gap-2 w-fit">
            <FileText className="h-3 w-3 sm:h-4 sm:w-4" />
            {exporting === 'pdf' ? 'Mengexport...' : 'Export PDF'}
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-2 sm:pb-4 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
              Filter Data
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
              <div>
                <Label className="text-xs sm:text-sm">Kelas</Label>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger className="text-xs sm:text-sm h-8 sm:h-10">
                    <SelectValue placeholder="Kelas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua</SelectItem>
                    {classes.map((kelas) => (
                      <SelectItem key={kelas.id} value={kelas.id}>
                        {kelas.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs sm:text-sm">Bulan</Label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="text-xs sm:text-sm h-8 sm:h-10">
                    <SelectValue placeholder="Bulan" />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((month, index) => (
                      <SelectItem key={index} value={String(index + 1)}>
                        {month.substring(0, 3)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs sm:text-sm">Tahun</Label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="text-xs sm:text-sm h-8 sm:h-10">
                    <SelectValue placeholder="Tahun" />
                  </SelectTrigger>
                  <SelectContent>
                    {[2023, 2024, 2025, 2026].map((year) => (
                      <SelectItem key={year} value={String(year)}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button onClick={loadAllData} disabled={loading} size="sm" className="w-full text-xs sm:text-sm h-8 sm:h-10">
                  <TrendingUp className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                  {loading ? 'Memuat...' : 'Refresh'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="students" className="space-y-3 sm:space-y-4">
          <TabsList className="grid w-full grid-cols-3 h-8 sm:h-10">
            <TabsTrigger value="students" className="text-xs sm:text-sm">Siswa</TabsTrigger>
            <TabsTrigger value="teachers" className="text-xs sm:text-sm">Guru</TabsTrigger>
            <TabsTrigger value="export" className="text-xs sm:text-sm">Export</TabsTrigger>
          </TabsList>

          {/* Student Attendance Tab */}
          <TabsContent value="students" className="space-y-4">
            {/* Summary Cards */}
            <div className="grid md:grid-cols-4 gap-4">
              <Card className="border-l-4 border-l-green-500">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-green-500/10 rounded-lg">
                      <UserCheck className="h-6 w-6 text-green-500" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Hadir</p>
                      <p className="text-2xl font-bold text-green-600">{studentStats.hadir}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-yellow-500">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-yellow-500/10 rounded-lg">
                      <Users className="h-6 w-6 text-yellow-500" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Izin</p>
                      <p className="text-2xl font-bold text-yellow-600">{studentStats.izin}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-blue-500">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-500/10 rounded-lg">
                      <Users className="h-6 w-6 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Sakit</p>
                      <p className="text-2xl font-bold text-blue-600">{studentStats.sakit}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-red-500">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-red-500/10 rounded-lg">
                      <UserX className="h-6 w-6 text-red-500" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Alpha</p>
                      <p className="text-2xl font-bold text-red-600">{studentStats.alpha}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid md:grid-cols-2 gap-4">
              <Card id="chart-student-monthly">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Kehadiran Bulanan (Siswa)
                    </CardTitle>
                    <CardDescription>Statistik kehadiran siswa sepanjang tahun {selectedYear}</CardDescription>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleExportChartPNG('chart-student-monthly', 'Kehadiran_Bulanan_Siswa')}
                    disabled={exporting === 'chart-student-monthly'}
                  >
                    <Image className="h-4 w-4 mr-1" />
                    PNG
                  </Button>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground mb-4">
                    * Hari Jumat dan hari libur tidak dihitung dalam statistik
                  </p>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={monthlyStudentData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Area type="monotone" dataKey="hadir" stackId="1" stroke="#22c55e" fill="#22c55e" name="Hadir" />
                      <Area type="monotone" dataKey="izin" stackId="1" stroke="#eab308" fill="#eab308" name="Izin" />
                      <Area type="monotone" dataKey="sakit" stackId="1" stroke="#3b82f6" fill="#3b82f6" name="Sakit" />
                      <Area type="monotone" dataKey="alpha" stackId="1" stroke="#ef4444" fill="#ef4444" name="Alpha" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card id="chart-student-distribution">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <PieChart className="h-5 w-5" />
                      Distribusi Kehadiran (Siswa)
                    </CardTitle>
                    <CardDescription>Persentase status kehadiran bulan {MONTHS[parseInt(selectedMonth) - 1]}</CardDescription>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleExportChartPNG('chart-student-distribution', 'Distribusi_Kehadiran_Siswa')}
                    disabled={exporting === 'chart-student-distribution'}
                  >
                    <Image className="h-4 w-4 mr-1" />
                    PNG
                  </Button>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsPieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Class Comparison */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Perbandingan Kehadiran per Kelas
                </CardTitle>
                <CardDescription>Persentase kehadiran per kelas bulan {MONTHS[parseInt(selectedMonth) - 1]}</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={classData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 100]} unit="%" />
                    <YAxis dataKey="name" type="category" width={100} />
                    <Tooltip formatter={(value) => `${value}%`} />
                    <Bar dataKey="percentage" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Persentase Hadir" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Teacher Attendance Tab */}
          <TabsContent value="teachers" className="space-y-4">
            {/* Summary Cards */}
            <div className="grid md:grid-cols-4 gap-4">
              <Card className="border-l-4 border-l-green-500">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-green-500/10 rounded-lg">
                      <UserCheck className="h-6 w-6 text-green-500" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Hadir</p>
                      <p className="text-2xl font-bold text-green-600">{teacherStats.hadir}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-yellow-500">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-yellow-500/10 rounded-lg">
                      <Users className="h-6 w-6 text-yellow-500" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Izin</p>
                      <p className="text-2xl font-bold text-yellow-600">{teacherStats.izin}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-blue-500">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-500/10 rounded-lg">
                      <Users className="h-6 w-6 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Sakit</p>
                      <p className="text-2xl font-bold text-blue-600">{teacherStats.sakit}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-red-500">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-red-500/10 rounded-lg">
                      <UserX className="h-6 w-6 text-red-500" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Alpha</p>
                      <p className="text-2xl font-bold text-red-600">{teacherStats.alpha}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Kehadiran Bulanan (Guru)
                  </CardTitle>
                  <CardDescription>Statistik kehadiran guru sepanjang tahun {selectedYear}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground mb-4">
                    * Hari Jumat dan hari libur tidak dihitung dalam statistik
                  </p>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={monthlyTeacherData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="hadir" stroke="#22c55e" strokeWidth={2} name="Hadir" />
                      <Line type="monotone" dataKey="izin" stroke="#eab308" strokeWidth={2} name="Izin" />
                      <Line type="monotone" dataKey="sakit" stroke="#3b82f6" strokeWidth={2} name="Sakit" />
                      <Line type="monotone" dataKey="alpha" stroke="#ef4444" strokeWidth={2} name="Alpha" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5" />
                    Distribusi Kehadiran (Guru)
                  </CardTitle>
                  <CardDescription>Persentase status kehadiran bulan {MONTHS[parseInt(selectedMonth) - 1]}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsPieChart>
                      <Pie
                        data={teacherPieData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {teacherPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Export Tab */}
          <TabsContent value="export" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5" />
                  Export Laporan ke Excel
                </CardTitle>
                <CardDescription>Pilih rentang tanggal dan jenis laporan yang ingin diexport</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label>Tanggal Mulai</Label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Tanggal Selesai</Label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Filter Kelas (Opsional)</Label>
                    <Select value={selectedClass} onValueChange={setSelectedClass}>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih kelas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Semua Kelas</SelectItem>
                        {classes.map((kelas) => (
                          <SelectItem key={kelas.id} value={kelas.id}>
                            {kelas.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <Card className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-green-500/10 rounded-lg">
                          <Users className="h-6 w-6 text-green-600" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">Absensi Siswa</CardTitle>
                          <CardDescription>Export rekap kehadiran siswa</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Button 
                        className="w-full" 
                        onClick={exportStudentAttendance}
                        disabled={exporting === 'student' || !startDate || !endDate}
                      >
                        {exporting === 'student' ? (
                          'Mengexport...'
                        ) : (
                          <>
                            <Download className="mr-2 h-4 w-4" />
                            Download Excel
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-500/10 rounded-lg">
                          <UserCheck className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">Absensi Guru</CardTitle>
                          <CardDescription>Export rekap kehadiran guru</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Button 
                        className="w-full" 
                        onClick={exportTeacherAttendance}
                        disabled={exporting === 'teacher' || !startDate || !endDate}
                      >
                        {exporting === 'teacher' ? (
                          'Mengexport...'
                        ) : (
                          <>
                            <Download className="mr-2 h-4 w-4" />
                            Download Excel
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-purple-500/10 rounded-lg">
                          <FileSpreadsheet className="h-6 w-6 text-purple-600" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">Nilai Siswa</CardTitle>
                          <CardDescription>Export rekap nilai siswa</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Button 
                        className="w-full" 
                        onClick={exportStudentGrades}
                        disabled={exporting === 'grades' || !startDate || !endDate}
                      >
                        {exporting === 'grades' ? (
                          'Mengexport...'
                        ) : (
                          <>
                            <Download className="mr-2 h-4 w-4" />
                            Download Excel
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
