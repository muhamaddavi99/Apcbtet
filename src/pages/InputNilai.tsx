import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { usePageTitle } from '@/hooks/usePageTitle';
import { Plus, Edit, Trash2, GraduationCap } from 'lucide-react';

interface Grade {
  id: string;
  grade_type: string;
  grade_value: number;
  description: string;
  academic_year: string;
  semester: string;
  student_id: string;
  subject_id: string;
  class_id: string;
  students?: { name: string; nis: string };
  subjects?: { name: string };
  classes?: { name: string };
}

const gradeTypes = [
  { value: 'tugas', label: 'Tugas' },
  { value: 'uh', label: 'Ulangan Harian' },
  { value: 'uts', label: 'UTS' },
  { value: 'uas', label: 'UAS' },
  { value: 'praktik', label: 'Praktik' },
];

const semesters = [
  { value: 'ganjil', label: 'Ganjil' },
  { value: 'genap', label: 'Genap' },
];

export default function InputNilai() {
  usePageTitle('Input Nilai Siswa');
  const [grades, setGrades] = useState<Grade[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentGrade, setCurrentGrade] = useState<Grade | null>(null);
  const [formData, setFormData] = useState({
    student_id: '',
    subject_id: '',
    class_id: '',
    grade_type: '',
    grade_value: '',
    academic_year: new Date().getFullYear().toString(),
    semester: '',
    description: '',
  });
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    loadUser();
    loadInitialData();
  }, []);

  useEffect(() => {
    if (formData.class_id) {
      loadStudentsByClass(formData.class_id);
    }
  }, [formData.class_id]);

  useEffect(() => {
    if (selectedClass && selectedSubject) {
      loadGrades();
    }
  }, [selectedClass, selectedSubject]);

  const loadUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setUserId(user.id);
  };

  const loadInitialData = async () => {
    try {
      const [classesRes, subjectsRes] = await Promise.all([
        supabase.from('classes').select('*').order('name'),
        supabase.from('subjects').select('*').order('name'),
      ]);

      setClasses(classesRes.data || []);
      setSubjects(subjectsRes.data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Gagal memuat data',
        variant: 'destructive',
      });
    }
  };

  const loadStudentsByClass = async (classId: string) => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('class_id', classId)
        .order('name');
      
      if (error) throw error;
      setStudents(data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Gagal memuat data siswa',
        variant: 'destructive',
      });
    }
  };

  const loadGrades = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('student_grades')
        .select('*, students(name, nis), subjects(name), classes(name)')
        .eq('class_id', selectedClass)
        .eq('subject_id', selectedSubject)
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGrades(data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Gagal memuat data nilai',
        variant: 'destructive',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const gradeData = {
        ...formData,
        grade_value: parseFloat(formData.grade_value),
        teacher_id: userId,
      };

      if (editMode && currentGrade) {
        const { error } = await supabase
          .from('student_grades')
          .update(gradeData)
          .eq('id', currentGrade.id);
        if (error) throw error;
        toast({ title: 'Berhasil', description: 'Nilai berhasil diperbarui' });
      } else {
        const { error } = await supabase
          .from('student_grades')
          .insert(gradeData);
        if (error) throw error;
        toast({ title: 'Berhasil', description: 'Nilai berhasil ditambahkan' });
      }
      loadGrades();
      handleDialogClose();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Gagal menyimpan nilai',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (grade: Grade) => {
    setCurrentGrade(grade);
    setFormData({
      student_id: grade.student_id,
      subject_id: grade.subject_id,
      class_id: grade.class_id,
      grade_type: grade.grade_type,
      grade_value: grade.grade_value.toString(),
      academic_year: grade.academic_year,
      semester: grade.semester,
      description: grade.description || '',
    });
    setEditMode(true);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus nilai ini?')) return;
    
    try {
      const { error } = await supabase.from('student_grades').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Berhasil', description: 'Nilai berhasil dihapus' });
      loadGrades();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Gagal menghapus nilai',
        variant: 'destructive',
      });
    }
  };

  const openAddDialog = () => {
    setFormData({
      ...formData,
      class_id: selectedClass,
      subject_id: selectedSubject,
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      student_id: '',
      subject_id: selectedSubject,
      class_id: selectedClass,
      grade_type: '',
      grade_value: '',
      academic_year: new Date().getFullYear().toString(),
      semester: '',
      description: '',
    });
    setCurrentGrade(null);
    setEditMode(false);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    resetForm();
  };

  const getGradeColor = (value: number) => {
    if (value >= 80) return 'text-green-600';
    if (value >= 70) return 'text-blue-600';
    if (value >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Input Nilai Siswa</h1>
            <p className="text-muted-foreground">Kelola nilai siswa per mata pelajaran</p>
          </div>
        </div>

        {/* Filter Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pilih Kelas & Mata Pelajaran</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label>Kelas</Label>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
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
                <Label>Mata Pelajaran</Label>
                <Select value={selectedSubject} onValueChange={setSelectedSubject}>
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
              <div className="flex items-end">
                <Button 
                  onClick={openAddDialog} 
                  disabled={!selectedClass || !selectedSubject}
                  className="w-full"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Tambah Nilai
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Grades Table */}
        {selectedClass && selectedSubject && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                Daftar Nilai
              </CardTitle>
            </CardHeader>
            <CardContent>
              {grades.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Belum ada data nilai
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Siswa</TableHead>
                      <TableHead>NIS</TableHead>
                      <TableHead>Jenis Nilai</TableHead>
                      <TableHead>Nilai</TableHead>
                      <TableHead>Semester</TableHead>
                      <TableHead>Keterangan</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {grades.map((grade) => (
                      <TableRow key={grade.id}>
                        <TableCell className="font-medium">{grade.students?.name}</TableCell>
                        <TableCell>{grade.students?.nis}</TableCell>
                        <TableCell className="capitalize">{grade.grade_type}</TableCell>
                        <TableCell className={`font-bold ${getGradeColor(grade.grade_value)}`}>
                          {grade.grade_value}
                        </TableCell>
                        <TableCell className="capitalize">{grade.semester}</TableCell>
                        <TableCell>{grade.description || '-'}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="outline" onClick={() => handleEdit(grade)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => handleDelete(grade.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}

        <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editMode ? 'Edit Nilai' : 'Tambah Nilai Baru'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="student_id">Siswa</Label>
                <Select value={formData.student_id} onValueChange={(value) => setFormData({ ...formData, student_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih siswa" />
                  </SelectTrigger>
                  <SelectContent>
                    {students.map((student) => (
                      <SelectItem key={student.id} value={student.id}>
                        {student.name} ({student.nis})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="grade_type">Jenis Nilai</Label>
                  <Select value={formData.grade_type} onValueChange={(value) => setFormData({ ...formData, grade_type: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih jenis" />
                    </SelectTrigger>
                    <SelectContent>
                      {gradeTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="grade_value">Nilai</Label>
                  <Input
                    id="grade_value"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={formData.grade_value}
                    onChange={(e) => setFormData({ ...formData, grade_value: e.target.value })}
                    placeholder="0-100"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="academic_year">Tahun Ajaran</Label>
                  <Input
                    id="academic_year"
                    value={formData.academic_year}
                    onChange={(e) => setFormData({ ...formData, academic_year: e.target.value })}
                    placeholder="2024/2025"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="semester">Semester</Label>
                  <Select value={formData.semester} onValueChange={(value) => setFormData({ ...formData, semester: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih semester" />
                    </SelectTrigger>
                    <SelectContent>
                      {semesters.map((sem) => (
                        <SelectItem key={sem.value} value={sem.value}>
                          {sem.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="description">Keterangan</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Keterangan (opsional)"
                  rows={2}
                />
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
