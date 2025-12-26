import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Plus, Users, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { usePageTitle } from '@/hooks/usePageTitle';

interface Kelas {
  id: string;
  name: string;
  grade: string;
  academic_year: string;
}

interface Siswa {
  id: string;
  nis: string;
  name: string;
  class_id: string | null;
}

export default function Kelas() {
  const [kelasList, setKelasList] = useState<Kelas[]>([]);
  const [selectedKelas, setSelectedKelas] = useState<Kelas | null>(null);
  const [siswaList, setSiswaList] = useState<Siswa[]>([]);
  const [attendanceDialog, setAttendanceDialog] = useState(false);
  const [kelasDialog, setKelasDialog] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentKelas, setCurrentKelas] = useState<Kelas | null>(null);
  const [formData, setFormData] = useState({ name: '', grade: '', academic_year: '' });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  usePageTitle('Data Kelas');

  useEffect(() => {
    loadKelas();
  }, []);

  const loadKelas = async () => {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .order('name');

      if (error) throw error;
      setKelasList(data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Gagal memuat data kelas',
        variant: 'destructive',
      });
    }
  };

  const loadSiswa = async (classId: string) => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('class_id', classId);

      if (error) throw error;
      setSiswaList(data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Gagal memuat data siswa',
        variant: 'destructive',
      });
    }
  };

  const handleKelasClick = async (kelas: Kelas) => {
    setSelectedKelas(kelas);
    await loadSiswa(kelas.id);
    setAttendanceDialog(true);
  };

  const handleAttendanceChange = async (studentId: string, status: 'hadir' | 'alpha' | 'izin' | 'sakit') => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data: session } = await supabase.auth.getSession();
      
      const { error } = await supabase
        .from('student_attendance')
        .upsert({
          student_id: studentId,
          class_id: selectedKelas?.id,
          date: today,
          status: status,
          created_by: session.session?.user.id,
        }, {
          onConflict: 'student_id,date',
        });

      if (error) throw error;

      toast({
        title: 'Berhasil',
        description: `Status absensi berhasil diubah menjadi ${status}`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Gagal mengubah status absensi',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editMode && currentKelas) {
        const { error } = await supabase
          .from('classes')
          .update(formData)
          .eq('id', currentKelas.id);

        if (error) throw error;
        toast({ title: 'Berhasil', description: 'Data kelas berhasil diperbarui' });
      } else {
        const { error } = await supabase
          .from('classes')
          .insert([formData]);

        if (error) throw error;
        toast({ title: 'Berhasil', description: 'Kelas berhasil ditambahkan' });
      }
      loadKelas();
      handleDialogClose();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Gagal menyimpan data kelas',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (kelas: Kelas) => {
    setCurrentKelas(kelas);
    setFormData({ name: kelas.name, grade: kelas.grade, academic_year: kelas.academic_year });
    setEditMode(true);
    setKelasDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus kelas ini?')) return;
    
    try {
      const { error } = await supabase
        .from('classes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: 'Berhasil', description: 'Kelas berhasil dihapus' });
      loadKelas();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Gagal menghapus kelas',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormData({ name: '', grade: '', academic_year: '' });
    setCurrentKelas(null);
    setEditMode(false);
  };

  const handleDialogClose = () => {
    setKelasDialog(false);
    resetForm();
  };

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">Manajemen Kelas</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Kelola data kelas dan absensi siswa</p>
          </div>
          <Button size="sm" className="text-xs sm:text-sm w-fit" onClick={() => setKelasDialog(true)}>
            <Plus className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Tambah Kelas</span>
            <span className="sm:hidden">Tambah</span>
          </Button>
        </div>

        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {kelasList.map((kelas) => (
            <Card key={kelas.id} className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader className="pb-2 sm:pb-4 px-3 sm:px-6 pt-3 sm:pt-6">
                <CardTitle className="flex items-center justify-between text-sm sm:text-base">
                  <span className="truncate">{kelas.name}</span>
                  <Users className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground flex-shrink-0" />
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                <div className="space-y-1 sm:space-y-2">
                  <p className="text-xs sm:text-sm text-muted-foreground">Tingkat: {kelas.grade}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">TA: {kelas.academic_year}</p>
                  <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-3 sm:mt-4">
                    <Button size="sm" className="text-xs h-7 sm:h-8 px-2 sm:px-3" onClick={() => handleKelasClick(kelas)}>
                      Absensi
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs h-7 sm:h-8 px-2 sm:px-3" onClick={() => handleEdit(kelas)}>
                      Edit
                    </Button>
                    <Button size="sm" variant="destructive" className="text-xs h-7 sm:h-8 px-2 sm:px-3" onClick={() => handleDelete(kelas.id)}>
                      Hapus
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Dialog open={kelasDialog} onOpenChange={handleDialogClose}>
          <DialogContent className="max-w-[95vw] sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base sm:text-lg">{editMode ? 'Edit Kelas' : 'Tambah Kelas Baru'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
              <div>
                <Label htmlFor="name" className="text-xs sm:text-sm">Nama Kelas</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="X IPA 1"
                  className="text-xs sm:text-sm h-8 sm:h-10"
                  required
                />
              </div>
              <div>
                <Label htmlFor="grade" className="text-xs sm:text-sm">Tingkat</Label>
                <Input
                  id="grade"
                  value={formData.grade}
                  onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                  placeholder="X, XI, XII"
                  className="text-xs sm:text-sm h-8 sm:h-10"
                  required
                />
              </div>
              <div>
                <Label htmlFor="academic_year" className="text-xs sm:text-sm">Tahun Ajaran</Label>
                <Input
                  id="academic_year"
                  value={formData.academic_year}
                  onChange={(e) => setFormData({ ...formData, academic_year: e.target.value })}
                  placeholder="2024/2025"
                  className="text-xs sm:text-sm h-8 sm:h-10"
                  required
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" size="sm" className="text-xs sm:text-sm" onClick={handleDialogClose}>
                  Batal
                </Button>
                <Button type="submit" size="sm" className="text-xs sm:text-sm" disabled={loading}>
                  {loading ? 'Menyimpan...' : 'Simpan'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={attendanceDialog} onOpenChange={setAttendanceDialog}>
          <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base sm:text-lg">Absensi Kelas {selectedKelas?.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-2 sm:space-y-3">
              {siswaList.map((siswa) => (
                <Card key={siswa.id}>
                  <CardContent className="pt-3 sm:pt-4 pb-3 sm:pb-4 px-3 sm:px-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
                      <div className="min-w-0">
                        <p className="font-semibold text-xs sm:text-sm truncate">{siswa.name}</p>
                        <p className="text-xs text-muted-foreground">NIS: {siswa.nis}</p>
                      </div>
                      <div className="flex flex-wrap gap-1 sm:gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-green-500 text-green-600 hover:bg-green-50 text-xs h-6 sm:h-8 px-1.5 sm:px-2"
                          onClick={() => handleAttendanceChange(siswa.id, 'hadir')}
                        >
                          <CheckCircle className="mr-0.5 sm:mr-1 h-3 w-3 sm:h-4 sm:w-4" />
                          <span className="hidden sm:inline">Hadir</span>
                          <span className="sm:hidden">H</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-500 text-red-600 hover:bg-red-50 text-xs h-6 sm:h-8 px-1.5 sm:px-2"
                          onClick={() => handleAttendanceChange(siswa.id, 'alpha')}
                        >
                          <XCircle className="mr-0.5 sm:mr-1 h-3 w-3 sm:h-4 sm:w-4" />
                          <span className="hidden sm:inline">Alpha</span>
                          <span className="sm:hidden">A</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-6 sm:h-8 px-1.5 sm:px-2"
                          onClick={() => handleAttendanceChange(siswa.id, 'izin')}
                        >
                          <Clock className="mr-0.5 sm:mr-1 h-3 w-3 sm:h-4 sm:w-4" />
                          <span className="hidden sm:inline">Izin</span>
                          <span className="sm:hidden">I</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-6 sm:h-8 px-1.5 sm:px-2"
                          onClick={() => handleAttendanceChange(siswa.id, 'sakit')}
                        >
                          <AlertCircle className="mr-0.5 sm:mr-1 h-3 w-3 sm:h-4 sm:w-4" />
                          <span className="hidden sm:inline">Sakit</span>
                          <span className="sm:hidden">S</span>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {siswaList.length === 0 && (
                <p className="text-center text-xs sm:text-sm text-muted-foreground py-6 sm:py-8">
                  Belum ada siswa di kelas ini
                </p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
