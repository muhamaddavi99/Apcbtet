import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, BookOpen } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';

interface MataPelajaran {
  id: string;
  code: string;
  name: string;
}

export default function MataPelajaran() {
  const [subjectList, setSubjectList] = useState<MataPelajaran[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentSubject, setCurrentSubject] = useState<MataPelajaran | null>(null);
  const [formData, setFormData] = useState({ code: '', name: '' });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  usePageTitle('Mata Pelajaran');

  useEffect(() => {
    loadSubjects();
  }, []);

  const loadSubjects = async () => {
    try {
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setSubjectList(data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Gagal memuat data mata pelajaran',
        variant: 'destructive',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editMode && currentSubject) {
        const { error } = await supabase
          .from('subjects')
          .update({ code: formData.code, name: formData.name })
          .eq('id', currentSubject.id);
        
        if (error) throw error;
        toast({ title: 'Berhasil', description: 'Mata pelajaran berhasil diperbarui' });
      } else {
        const { error } = await supabase
          .from('subjects')
          .insert([{ code: formData.code, name: formData.name }]);
        
        if (error) throw error;
        toast({ title: 'Berhasil', description: 'Mata pelajaran berhasil ditambahkan' });
      }
      loadSubjects();
      handleDialogClose();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Gagal menyimpan mata pelajaran',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (subject: MataPelajaran) => {
    setCurrentSubject(subject);
    setFormData({ code: subject.code, name: subject.name });
    setEditMode(true);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus mata pelajaran ini?')) return;
    
    try {
      const { error } = await supabase
        .from('subjects')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      toast({ title: 'Berhasil', description: 'Mata pelajaran berhasil dihapus' });
      loadSubjects();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Gagal menghapus mata pelajaran',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormData({ code: '', name: '' });
    setCurrentSubject(null);
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
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold truncate">Mata Pelajaran</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Kelola data mata pelajaran</p>
          </div>
          <Button onClick={() => setDialogOpen(true)} size="sm" className="self-start sm:self-auto gap-1 sm:gap-2">
            <Plus className="h-4 w-4" />
            <span className="text-xs sm:text-sm hidden sm:inline">Tambah Mata Pelajaran</span>
            <span className="text-xs sm:hidden">Tambah</span>
          </Button>
        </div>

        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {subjectList.map((subject, index) => (
            <Card 
              key={subject.id} 
              className="hover:shadow-lg transition-all duration-300 hover:scale-[1.02] animate-fade-up"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6 pb-3 sm:pb-6">
                <div className="flex items-start justify-between mb-3 sm:mb-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="p-1.5 sm:p-2 rounded-lg bg-primary/10">
                      <BookOpen className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-sm sm:text-lg truncate">{subject.name}</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground">Kode: {subject.code}</p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-1.5 sm:gap-2">
                  <Button size="sm" variant="outline" className="text-xs h-7 sm:h-8 px-2 sm:px-3" onClick={() => handleEdit(subject)}>
                    Edit
                  </Button>
                  <Button size="sm" variant="destructive" className="text-xs h-7 sm:h-8 px-2 sm:px-3" onClick={() => handleDelete(subject.id)}>
                    Hapus
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {subjectList.length === 0 && (
            <Card className="col-span-full animate-fade-up">
              <CardContent className="py-8 sm:py-12 text-center text-muted-foreground text-xs sm:text-sm">
                Belum ada mata pelajaran
              </CardContent>
            </Card>
          )}
        </div>

        <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
          <DialogContent className="max-w-[95vw] sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base sm:text-lg">{editMode ? 'Edit Mata Pelajaran' : 'Tambah Mata Pelajaran Baru'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
              <div>
                <Label htmlFor="code">Kode Mata Pelajaran</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="MTK-001"
                  required
                />
              </div>
              <div>
                <Label htmlFor="name">Nama Mata Pelajaran</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Matematika"
                  required
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
