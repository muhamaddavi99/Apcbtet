import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Calendar, User, GraduationCap, Search, BookOpen, Clock } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';

interface TeacherStats {
  id: string;
  full_name: string;
  avatar_url: string | null;
  total_mengajar: number;
  hadir: number;
  izin: number;
  sakit: number;
  alpha: number;
}

interface StudentStats {
  id: string;
  name: string;
  avatar_url: string | null;
  nis: string;
  class_name: string;
  hadir: number;
  izin: number;
  sakit: number;
  alpha: number;
}

export default function RekapAbsensiDetail() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [teacherStats, setTeacherStats] = useState<TeacherStats[]>([]);
  const [studentStats, setStudentStats] = useState<StudentStats[]>([]);

  usePageTitle('Detail Rekap Absensi');
  const [selectedPerson, setSelectedPerson] = useState<any>(null);
  const [personHistory, setPersonHistory] = useState<{ attendance?: any[]; journals?: any[] }>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadStats();
  }, [selectedDate]);

  const loadStats = async () => {
    setLoading(true);
    try {
      // Load teacher attendance stats
      const { data: teachers } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, role')
        .in('role', ['teacher', 'staff']);

      if (teachers) {
        const statsPromises = teachers.map(async (teacher) => {
          const { data: attendance } = await supabase
            .from('attendance')
            .select('status')
            .eq('user_id', teacher.id);

          const { count: teachingCount } = await supabase
            .from('teaching_journals')
            .select('id', { count: 'exact', head: true })
            .eq('teacher_id', teacher.id);

          const stats = {
            hadir: attendance?.filter(a => a.status === 'hadir').length || 0,
            izin: attendance?.filter(a => a.status === 'izin').length || 0,
            sakit: attendance?.filter(a => a.status === 'sakit').length || 0,
            alpha: attendance?.filter(a => a.status === 'alpha').length || 0,
          };

          return {
            ...teacher,
            ...stats,
            total_mengajar: teachingCount || 0,
          };
        });

        const teacherStatsData = await Promise.all(statsPromises);
        setTeacherStats(teacherStatsData);
      }

      // Load student attendance stats
      const { data: students } = await supabase
        .from('students')
        .select('id, name, nis, avatar_url, class_id, classes(name)');

      if (students) {
        const studentStatsPromises = students.map(async (student) => {
          const { data: attendance } = await supabase
            .from('student_attendance')
            .select('status')
            .eq('student_id', student.id);

          const stats = {
            hadir: attendance?.filter(a => a.status === 'hadir').length || 0,
            izin: attendance?.filter(a => a.status === 'izin').length || 0,
            sakit: attendance?.filter(a => a.status === 'sakit').length || 0,
            alpha: attendance?.filter(a => a.status === 'alpha').length || 0,
          };

          return {
            ...student,
            ...stats,
            class_name: (student as any).classes?.name || '-',
          };
        });

        const studentStatsData = await Promise.all(studentStatsPromises);
        setStudentStats(studentStatsData);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Gagal memuat data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadPersonHistory = async (personId: string, type: 'teacher' | 'student') => {
    try {
      if (type === 'teacher') {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', personId)
          .single();

        const { data: attendance } = await supabase
          .from('attendance')
          .select('*')
          .eq('user_id', personId)
          .order('date', { ascending: false })
          .limit(30);

        const { data: journals } = await supabase
          .from('teaching_journals')
          .select('*, subjects(name), classes(name)')
          .eq('teacher_id', personId)
          .order('date', { ascending: false })
          .limit(30);

        setSelectedPerson({ ...profile, type: 'teacher' });
        setPersonHistory({ attendance, journals });
      } else {
        const { data: student } = await supabase
          .from('students')
          .select('*, classes(name)')
          .eq('id', personId)
          .single();

        const { data: attendance } = await supabase
          .from('student_attendance')
          .select('*')
          .eq('student_id', personId)
          .order('date', { ascending: false })
          .limit(30);

        setSelectedPerson({ ...student, type: 'student' });
        setPersonHistory({ attendance });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Gagal memuat riwayat',
        variant: 'destructive',
      });
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, string> = {
      hadir: 'bg-green-500/10 text-green-600',
      izin: 'bg-yellow-500/10 text-yellow-600',
      sakit: 'bg-blue-500/10 text-blue-600',
      alpha: 'bg-red-500/10 text-red-600',
    };
    return statusConfig[status] || 'bg-muted text-muted-foreground';
  };

  const filteredTeachers = teacherStats.filter(t =>
    t.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredStudents = studentStats.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.nis.includes(searchTerm)
  );

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Rekap Absensi Detail</h1>
          <p className="text-muted-foreground">Lihat riwayat absensi per individu</p>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Label>Cari</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama atau NIS..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div>
            <Label>Tanggal</Label>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Left Side - List */}
          <div className="space-y-4">
            <Tabs defaultValue="teachers">
              <TabsList className="w-full">
                <TabsTrigger value="teachers" className="flex-1 gap-2">
                  <User className="h-4 w-4" />
                  Guru/Staf
                </TabsTrigger>
                <TabsTrigger value="students" className="flex-1 gap-2">
                  <GraduationCap className="h-4 w-4" />
                  Siswa
                </TabsTrigger>
              </TabsList>

              <TabsContent value="teachers" className="space-y-2 mt-4">
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">Memuat data...</div>
                ) : filteredTeachers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">Tidak ada data guru/staf</div>
                ) : (
                  filteredTeachers.map((teacher) => (
                    <Card
                      key={teacher.id}
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        selectedPerson?.id === teacher.id ? 'ring-2 ring-primary' : ''
                      }`}
                      onClick={() => loadPersonHistory(teacher.id, 'teacher')}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={teacher.avatar_url || ''} />
                            <AvatarFallback>{getInitials(teacher.full_name)}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="font-semibold">{teacher.full_name}</p>
                            <div className="flex gap-2 text-xs mt-1">
                              <span className="text-green-600">H: {teacher.hadir}</span>
                              <span className="text-yellow-600">I: {teacher.izin}</span>
                              <span className="text-blue-600">S: {teacher.sakit}</span>
                              <span className="text-red-600">A: {teacher.alpha}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              <BookOpen className="inline h-3 w-3 mr-1" />
                              Mengajar: {teacher.total_mengajar}x
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>

              <TabsContent value="students" className="space-y-2 mt-4">
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">Memuat data...</div>
                ) : filteredStudents.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">Tidak ada data siswa</div>
                ) : (
                  filteredStudents.map((student) => (
                    <Card
                      key={student.id}
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        selectedPerson?.id === student.id ? 'ring-2 ring-primary' : ''
                      }`}
                      onClick={() => loadPersonHistory(student.id, 'student')}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={student.avatar_url || ''} />
                            <AvatarFallback>{getInitials(student.name)}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="font-semibold">{student.name}</p>
                            <p className="text-xs text-muted-foreground">NIS: {student.nis} • {student.class_name}</p>
                            <div className="flex gap-2 text-xs mt-1">
                              <span className="text-green-600">H: {student.hadir}</span>
                              <span className="text-yellow-600">I: {student.izin}</span>
                              <span className="text-blue-600">S: {student.sakit}</span>
                              <span className="text-red-600">A: {student.alpha}</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Side - Detail */}
          <div>
            {selectedPerson ? (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={selectedPerson.avatar_url || ''} />
                      <AvatarFallback className="text-xl">
                        {getInitials(selectedPerson.full_name || selectedPerson.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle>{selectedPerson.full_name || selectedPerson.name}</CardTitle>
                      <CardDescription>
                        {selectedPerson.type === 'teacher' ? (
                          <>
                            NIP: {selectedPerson.nip} • {selectedPerson.role === 'teacher' ? 'Guru' : 'Staf'}
                          </>
                        ) : (
                          <>
                            NIS: {selectedPerson.nis} • {selectedPerson.classes?.name}
                          </>
                        )}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Riwayat Absensi (30 hari terakhir)</h4>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {personHistory.attendance && personHistory.attendance.length > 0 ? (
                        personHistory.attendance.map((item: any, index: number) => (
                          <div key={index} className="flex items-center justify-between p-2 border rounded">
                            <span className="text-sm">
                              {new Date(item.date).toLocaleDateString('id-ID', {
                                weekday: 'short',
                                day: 'numeric',
                                month: 'short',
                              })}
                            </span>
                            <span className={`px-2 py-1 rounded text-xs ${getStatusBadge(item.status)}`}>
                              {item.status}
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">Belum ada riwayat absensi</p>
                      )}
                    </div>
                  </div>

                  {selectedPerson.type === 'teacher' && personHistory.journals && (
                    <div>
                      <h4 className="font-semibold mb-2">Riwayat Mengajar (30 hari terakhir)</h4>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {personHistory.journals.map((item: any, index: number) => (
                          <div key={index} className="p-2 border rounded">
                            <div className="flex justify-between">
                              <span className="text-sm font-medium">{item.subjects?.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {new Date(item.date).toLocaleDateString('id-ID')}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground">{item.classes?.name} • {item.topic}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card className="h-full flex items-center justify-center min-h-[400px]">
                <div className="text-center text-muted-foreground">
                  <User className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Pilih guru/staf atau siswa untuk melihat detail</p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
