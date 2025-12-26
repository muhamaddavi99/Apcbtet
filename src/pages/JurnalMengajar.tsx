import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { usePageTitle } from '@/hooks/usePageTitle';
import { Plus, BookOpen, Calendar, Edit, Trash2, FileText } from 'lucide-react';

interface Journal {
  id: string;
  date: string;
  topic: string;
  description: string;
  teaching_method: string;
  learning_objectives: string;
  notes: string;
  class_id: string;
  subject_id: string;
  classes?: { name: string };
  subjects?: { name: string };
}

export default function JurnalMengajar() {
  usePageTitle('Jurnal Mengajar');
  const [journals, setJournals] = useState<Journal[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentJournal, setCurrentJournal] = useState<Journal | null>(null);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    topic: '',
    description: '',
    teaching_method: '',
    learning_objectives: '',
    notes: '',
    class_id: '',
    subject_id: '',
  });
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    loadUser();
    loadData();
  }, []);

  const loadUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setUserId(user.id);
  };

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [journalsRes, classesRes, subjectsRes] = await Promise.all([
        supabase
          .from('teaching_journals')
          .select('*, classes(name), subjects(name)')
          .eq('teacher_id', user.id)
          .order('date', { ascending: false }),
        supabase.from('classes').select('*').order('name'),
        supabase.from('subjects').select('*').order('name'),
      ]);

      if (journalsRes.error) throw journalsRes.error;
      setJournals(journalsRes.data || []);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editMode && currentJournal) {
        const { error } = await supabase
          .from('teaching_journals')
          .update(formData)
          .eq('id', currentJournal.id);
        if (error) throw error;
        toast({ title: 'Berhasil', description: 'Jurnal berhasil diperbarui' });
      } else {
        const { error } = await supabase
          .from('teaching_journals')
          .insert({ ...formData, teacher_id: userId });
        if (error) throw error;
        toast({ title: 'Berhasil', description: 'Jurnal berhasil ditambahkan' });
      }
      loadData();
      handleDialogClose();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Gagal menyimpan jurnal',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (journal: Journal) => {
    setCurrentJournal(journal);
    setFormData({
      date: journal.date,
      topic: journal.topic || '',
      description: journal.description || '',
      teaching_method: journal.teaching_method || '',
      learning_objectives: journal.learning_objectives || '',
      notes: journal.notes || '',
      class_id: journal.class_id,
      subject_id: journal.subject_id,
    });
    setEditMode(true);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus jurnal ini?')) return;
    
    try {
      const { error } = await supabase.from('teaching_journals').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Berhasil', description: 'Jurnal berhasil dihapus' });
      loadData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Gagal menghapus jurnal',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      topic: '',
      description: '',
      teaching_method: '',
      learning_objectives: '',
      notes: '',
      class_id: '',
      subject_id: '',
    });
    setCurrentJournal(null);
    setEditMode(false);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    resetForm();
  };

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold truncate">Jurnal Mengajar</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Catatan kegiatan pembelajaran harian</p>
          </div>
          <Button onClick={() => setDialogOpen(true)} size="sm" className="self-start sm:self-auto gap-1 sm:gap-2">
            <Plus className="h-4 w-4" />
            <span className="text-xs sm:text-sm">Tambah Jurnal</span>
          </Button>
        </div>

        <div className="grid gap-3 sm:gap-4">
          {journals.length === 0 ? (
            <Card className="animate-fade-up">
              <CardContent className="py-8 sm:py-12 text-center">
                <FileText className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-muted-foreground mb-3 sm:mb-4" />
                <p className="text-muted-foreground text-xs sm:text-sm">Belum ada jurnal mengajar</p>
              </CardContent>
            </Card>
          ) : (
            journals.map((journal, index) => (
              <Card 
                key={journal.id} 
                className="animate-fade-up hover:shadow-lg transition-all duration-300" 
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                      <div className="p-1.5 sm:p-2 bg-primary/10 rounded-lg shrink-0">
                        <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="text-sm sm:text-lg truncate">{journal.topic}</CardTitle>
                        <div className="flex gap-2 text-[10px] sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
                          <span className="flex items-center gap-0.5 sm:gap-1 truncate">
                            <Calendar className="h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0" />
                            {new Date(journal.date).toLocaleDateString('id-ID', {
                              weekday: 'short',
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1 sm:gap-2 shrink-0">
                      <Button size="sm" variant="outline" className="h-7 sm:h-8 w-7 sm:w-8 p-0" onClick={() => handleEdit(journal)}>
                        <Edit className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      </Button>
                      <Button size="sm" variant="destructive" className="h-7 sm:h-8 w-7 sm:w-8 p-0" onClick={() => handleDelete(journal.id)}>
                        <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                  <div className="grid grid-cols-2 gap-2 sm:gap-4 text-xs sm:text-sm">
                    <div>
                      <span className="text-muted-foreground">Kelas:</span>
                      <span className="ml-1 sm:ml-2 font-medium">{journal.classes?.name || '-'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Mapel:</span>
                      <span className="ml-1 sm:ml-2 font-medium">{journal.subjects?.name || '-'}</span>
                    </div>
                  </div>
                  {journal.description && (
                    <p className="mt-2 sm:mt-3 text-xs sm:text-sm text-muted-foreground line-clamp-2">{journal.description}</p>
                  )}
                  {journal.teaching_method && (
                    <div className="mt-2">
                      <span className="text-[10px] sm:text-xs bg-secondary px-1.5 sm:px-2 py-0.5 sm:py-1 rounded">
                        Metode: {journal.teaching_method}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
          <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base sm:text-lg">{editMode ? 'Edit Jurnal' : 'Tambah Jurnal Baru'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="date">Tanggal</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
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
                <Label htmlFor="topic">Topik/Materi</Label>
                <Input
                  id="topic"
                  value={formData.topic}
                  onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                  placeholder="Masukkan topik pembelajaran"
                  required
                />
              </div>
              <div>
                <Label htmlFor="learning_objectives">Tujuan Pembelajaran</Label>
                <Textarea
                  id="learning_objectives"
                  value={formData.learning_objectives}
                  onChange={(e) => setFormData({ ...formData, learning_objectives: e.target.value })}
                  placeholder="Tuliskan tujuan pembelajaran"
                  rows={2}
                />
              </div>
              <div>
                <Label htmlFor="teaching_method">Metode Mengajar</Label>
                <Input
                  id="teaching_method"
                  value={formData.teaching_method}
                  onChange={(e) => setFormData({ ...formData, teaching_method: e.target.value })}
                  placeholder="Contoh: Ceramah, Diskusi, Praktikum"
                />
              </div>
              <div>
                <Label htmlFor="description">Deskripsi Kegiatan</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Tuliskan deskripsi kegiatan pembelajaran"
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="notes">Catatan Tambahan</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Catatan tambahan (opsional)"
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
