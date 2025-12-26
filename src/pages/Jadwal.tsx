import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Calendar, Clock, Edit, Trash2 } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';

interface Schedule {
  id: string;
  day: string;
  start_time: string;
  end_time: string;
  subject_id: string;
  teacher_id: string;
  class_id: string;
  subjects?: { name: string };
  profiles?: { full_name: string };
  classes?: { name: string };
}

export default function Jadwal() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentSchedule, setCurrentSchedule] = useState<Schedule | null>(null);
  const [formData, setFormData] = useState({
    day: '',
    start_time: '',
    end_time: '',
    subject_id: '',
    teacher_id: '',
    class_id: '',
  });
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const { toast } = useToast();

  usePageTitle('Jadwal Pelajaran');

  useEffect(() => {
    loadProfile();
    loadData();
  }, []);

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      setProfile(data);
    }
  };

  const loadData = async () => {
    try {
      const [schedulesRes, classesRes, subjectsRes, teachersRes] = await Promise.all([
        supabase
          .from('schedules')
          .select('*, subjects(name), profiles(full_name), classes(name)')
          .order('day')
          .order('start_time'),
        supabase.from('classes').select('*').order('name'),
        supabase.from('subjects').select('*').order('name'),
        supabase.from('profiles').select('*').or('role.eq.teacher,can_teach.eq.true').order('full_name'),
      ]);

      if (schedulesRes.error) throw schedulesRes.error;
      if (classesRes.error) throw classesRes.error;
      if (subjectsRes.error) throw subjectsRes.error;
      if (teachersRes.error) throw teachersRes.error;

      setSchedules(schedulesRes.data || []);
      setClasses(classesRes.data || []);
      setSubjects(subjectsRes.data || []);
      setTeachers(teachersRes.data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Gagal memuat data',
        variant: 'destructive',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all fields
    if (!formData.day || !formData.start_time || !formData.end_time || !formData.class_id || !formData.subject_id || !formData.teacher_id) {
      toast({
        title: 'Error',
        description: 'Semua field harus diisi',
        variant: 'destructive',
      });
      return;
    }
    
    setLoading(true);
    try {
      if (editMode && currentSchedule) {
        const { error } = await supabase
          .from('schedules')
          .update(formData)
          .eq('id', currentSchedule.id);
        if (error) throw error;
        toast({ title: 'Berhasil', description: 'Jadwal berhasil diperbarui' });
      } else {
        const { error } = await supabase
          .from('schedules')
          .insert(formData);
        if (error) throw error;
        toast({ title: 'Berhasil', description: 'Jadwal berhasil ditambahkan' });
      }
      loadData();
      handleDialogClose();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Gagal menyimpan jadwal',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (schedule: Schedule) => {
    setCurrentSchedule(schedule);
    setFormData({
      day: schedule.day,
      start_time: schedule.start_time,
      end_time: schedule.end_time,
      subject_id: schedule.subject_id,
      teacher_id: schedule.teacher_id,
      class_id: schedule.class_id,
    });
    setEditMode(true);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus jadwal ini?')) return;
    
    try {
      const { error } = await supabase.from('schedules').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Berhasil', description: 'Jadwal berhasil dihapus' });
      loadData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Gagal menghapus jadwal',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormData({ day: '', start_time: '', end_time: '', subject_id: '', teacher_id: '', class_id: '' });
    setCurrentSchedule(null);
    setEditMode(false);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    resetForm();
  };

  const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Sabtu', 'Ahad'];
  const isAdmin = profile?.role === 'admin';

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold truncate">Jadwal Pelajaran</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Kelola jadwal pelajaran sekolah</p>
          </div>
          {isAdmin && (
            <Button onClick={() => setDialogOpen(true)} size="sm" className="self-start sm:self-auto gap-1 sm:gap-2">
              <Plus className="h-4 w-4" />
              <span className="text-xs sm:text-sm">Tambah Jadwal</span>
            </Button>
          )}
        </div>

        {days.map((day, dayIndex) => (
          <Card key={day} className="animate-fade-up" style={{ animationDelay: `${dayIndex * 0.1}s` }}>
            <CardHeader className="pb-2 sm:pb-4 px-3 sm:px-6 pt-3 sm:pt-6">
              <CardTitle className="flex items-center text-sm sm:text-base">
                <Calendar className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                {day}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
              <div className="space-y-2 sm:space-y-3">
                {schedules
                  .filter((schedule) => schedule.day === day)
                  .map((schedule, index) => (
                    <div 
                      key={schedule.id} 
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 p-3 sm:p-4 rounded-lg border border-border hover:bg-accent/50 transition-all duration-300 animate-fade-in"
                      style={{ animationDelay: `${index * 0.05}s` }}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4 flex-1 min-w-0">
                        <div className="flex items-center text-muted-foreground shrink-0">
                          <Clock className="mr-1.5 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          <span className="font-medium text-xs sm:text-sm">{schedule.start_time} - {schedule.end_time}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm sm:text-base truncate">{schedule.subjects?.name || 'Tidak ada mapel'}</p>
                          <p className="text-xs sm:text-sm text-muted-foreground truncate">Kelas: {schedule.classes?.name || '-'}</p>
                          <p className="text-xs sm:text-sm text-muted-foreground truncate">Guru: {schedule.profiles?.full_name || '-'}</p>
                        </div>
                      </div>
                      {isAdmin && (
                        <div className="flex gap-1.5 sm:gap-2 shrink-0">
                          <Button size="sm" variant="outline" className="h-7 sm:h-8 w-7 sm:w-8 p-0" onClick={() => handleEdit(schedule)}>
                            <Edit className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          </Button>
                          <Button size="sm" variant="destructive" className="h-7 sm:h-8 w-7 sm:w-8 p-0" onClick={() => handleDelete(schedule.id)}>
                            <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                {schedules.filter((s) => s.day === day).length === 0 && (
                  <p className="text-center text-muted-foreground text-xs sm:text-sm py-4 sm:py-6">Belum ada jadwal</p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
          <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base sm:text-lg">{editMode ? 'Edit Jadwal' : 'Tambah Jadwal Baru'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
              <div>
                <Label htmlFor="day">Hari</Label>
                <Select value={formData.day} onValueChange={(value) => setFormData({ ...formData, day: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih hari" />
                  </SelectTrigger>
                  <SelectContent>
                    {days.map((day) => (
                      <SelectItem key={day} value={day}>
                        {day}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start_time">Jam Mulai</Label>
                  <Input
                    id="start_time"
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="end_time">Jam Selesai</Label>
                  <Input
                    id="end_time"
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="class_id">Kelas</Label>
                <Select value={formData.class_id} onValueChange={(value) => setFormData({ ...formData, class_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih kelas" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((kelas) => (
                      <SelectItem key={kelas.id} value={kelas.id}>
                        {kelas.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="subject_id">Mata Pelajaran</Label>
                <Select value={formData.subject_id} onValueChange={(value) => setFormData({ ...formData, subject_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih mata pelajaran" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((subject) => (
                      <SelectItem key={subject.id} value={subject.id}>
                        {subject.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="teacher_id">Guru</Label>
                <Select value={formData.teacher_id} onValueChange={(value) => setFormData({ ...formData, teacher_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih guru" />
                  </SelectTrigger>
                  <SelectContent>
                    {teachers.map((teacher) => (
                      <SelectItem key={teacher.id} value={teacher.id}>
                        {teacher.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={handleDialogClose}>
                  Batal
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Menyimpan...' : 'Simpan'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
