import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Check, X, Clock, Calendar, Users, Save, Loader2 } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';

interface Student {
  id: string;
  nis: string;
  name: string;
  class_id: string | null;
}

interface Kelas {
  id: string;
  name: string;
}

interface AttendanceRecord {
  student_id: string;
  status: 'hadir' | 'izin' | 'sakit' | 'alpha';
  notes: string;
}

export default function AbsensiSiswa() {
  const [classes, setClasses] = useState<Kelas[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [attendance, setAttendance] = useState<Record<string, AttendanceRecord>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [existingAttendance, setExistingAttendance] = useState<any[]>([]);
  const { toast } = useToast();

  usePageTitle('Absensi Siswa');

  useEffect(() => {
    loadClasses();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      loadStudents(selectedClass);
      loadExistingAttendance(selectedClass, selectedDate);
    }
  }, [selectedClass, selectedDate]);

  const loadClasses = async () => {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .order('name');

      if (error) throw error;
      setClasses(data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Gagal memuat data kelas',
        variant: 'destructive',
      });
    }
  };

  const loadStudents = async (classId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('class_id', classId)
        .order('name');

      if (error) throw error;
      setStudents(data || []);
      
      // Initialize attendance records for all students
      const initialAttendance: Record<string, AttendanceRecord> = {};
      (data || []).forEach(student => {
        initialAttendance[student.id] = {
          student_id: student.id,
          status: 'hadir',
          notes: '',
        };
      });
      setAttendance(initialAttendance);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Gagal memuat data siswa',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadExistingAttendance = async (classId: string, date: string) => {
    try {
      const { data, error } = await supabase
        .from('student_attendance')
        .select('*')
        .eq('class_id', classId)
        .eq('date', date);

      if (error) throw error;
      setExistingAttendance(data || []);

      // Update attendance state with existing data
      if (data && data.length > 0) {
        const existingRecords: Record<string, AttendanceRecord> = {};
        data.forEach(record => {
          existingRecords[record.student_id] = {
            student_id: record.student_id,
            status: record.status as any,
            notes: record.notes || '',
          };
        });
        setAttendance(prev => ({ ...prev, ...existingRecords }));
      }
    } catch (error: any) {
      console.error('Error loading existing attendance:', error);
    }
  };

  const updateAttendance = (studentId: string, status: AttendanceRecord['status']) => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        student_id: studentId,
        status,
      },
    }));
  };

  const handleSave = async () => {
    if (!selectedClass || students.length === 0) {
      toast({
        title: 'Error',
        description: 'Pilih kelas dan pastikan ada siswa',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const userId = session.session?.user.id;

      // Prepare records for upsert
      const records = Object.values(attendance).map(record => ({
        student_id: record.student_id,
        class_id: selectedClass,
        date: selectedDate,
        status: record.status,
        notes: record.notes || null,
        created_by: userId,
      }));

      // Delete existing records for this class and date
      const { error: deleteError } = await supabase
        .from('student_attendance')
        .delete()
        .eq('class_id', selectedClass)
        .eq('date', selectedDate);

      if (deleteError) throw deleteError;

      // Insert new records
      const { error: insertError } = await supabase
        .from('student_attendance')
        .insert(records);

      if (insertError) throw insertError;

      toast({
        title: 'Berhasil',
        description: `Absensi ${students.length} siswa berhasil disimpan`,
      });

      loadExistingAttendance(selectedClass, selectedDate);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Gagal menyimpan absensi',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'hadir': return 'bg-green-500';
      case 'izin': return 'bg-blue-500';
      case 'sakit': return 'bg-yellow-500';
      case 'alpha': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusCount = (status: string) => {
    return Object.values(attendance).filter(a => a.status === status).length;
  };

  const selectedClassName = classes.find(c => c.id === selectedClass)?.name || '';

  return (
    <Layout>
      <div className="space-y-6">
        <div className="animate-fade-in">
          <h1 className="text-3xl font-bold text-foreground">Absensi Siswa</h1>
          <p className="text-muted-foreground">Input kehadiran siswa per kelas</p>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Pilih Kelas</Label>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih kelas..." />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map(kelas => (
                      <SelectItem key={kelas.id} value={kelas.id}>
                        {kelas.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tanggal</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border rounded-md bg-background"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary */}
        {selectedClass && students.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border-l-4 border-l-green-500">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Hadir</p>
                    <p className="text-2xl font-bold text-green-600">{getStatusCount('hadir')}</p>
                  </div>
                  <Check className="h-8 w-8 text-green-500 opacity-50" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Izin</p>
                    <p className="text-2xl font-bold text-blue-600">{getStatusCount('izin')}</p>
                  </div>
                  <Clock className="h-8 w-8 text-blue-500 opacity-50" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-yellow-500">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Sakit</p>
                    <p className="text-2xl font-bold text-yellow-600">{getStatusCount('sakit')}</p>
                  </div>
                  <X className="h-8 w-8 text-yellow-500 opacity-50" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-red-500">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Alpha</p>
                    <p className="text-2xl font-bold text-red-600">{getStatusCount('alpha')}</p>
                  </div>
                  <X className="h-8 w-8 text-red-500 opacity-50" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Student List */}
        {selectedClass && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Daftar Siswa - {selectedClassName}
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {existingAttendance.length > 0 ? 'Data absensi sudah ada untuk tanggal ini' : 'Belum ada data absensi'}
                </p>
              </div>
              <Button onClick={handleSave} disabled={saving || students.length === 0}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Simpan Absensi
                  </>
                )}
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : students.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  Tidak ada siswa di kelas ini
                </div>
              ) : (
                <div className="space-y-3">
                  {students.map((student, index) => (
                    <div
                      key={student.id}
                      className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors animate-fade-up"
                      style={{ animationDelay: `${index * 0.05}s` }}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-3 h-3 rounded-full ${getStatusColor(attendance[student.id]?.status || 'hadir')}`} />
                        <div>
                          <p className="font-medium">{student.name}</p>
                          <p className="text-sm text-muted-foreground">NIS: {student.nis}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant={attendance[student.id]?.status === 'hadir' ? 'default' : 'outline'}
                          className={attendance[student.id]?.status === 'hadir' ? 'bg-green-500 hover:bg-green-600' : ''}
                          onClick={() => updateAttendance(student.id, 'hadir')}
                        >
                          Hadir
                        </Button>
                        <Button
                          size="sm"
                          variant={attendance[student.id]?.status === 'izin' ? 'default' : 'outline'}
                          className={attendance[student.id]?.status === 'izin' ? 'bg-blue-500 hover:bg-blue-600' : ''}
                          onClick={() => updateAttendance(student.id, 'izin')}
                        >
                          Izin
                        </Button>
                        <Button
                          size="sm"
                          variant={attendance[student.id]?.status === 'sakit' ? 'default' : 'outline'}
                          className={attendance[student.id]?.status === 'sakit' ? 'bg-yellow-500 hover:bg-yellow-600' : ''}
                          onClick={() => updateAttendance(student.id, 'sakit')}
                        >
                          Sakit
                        </Button>
                        <Button
                          size="sm"
                          variant={attendance[student.id]?.status === 'alpha' ? 'default' : 'outline'}
                          className={attendance[student.id]?.status === 'alpha' ? 'bg-red-500 hover:bg-red-600' : ''}
                          onClick={() => updateAttendance(student.id, 'alpha')}
                        >
                          Alpha
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {!selectedClass && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Pilih kelas untuk memulai input absensi siswa</p>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
