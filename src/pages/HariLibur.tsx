import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Plus, Calendar as CalendarIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { usePageTitle } from '@/hooks/usePageTitle';

interface HariLibur {
  id: string;
  date: string;
  name: string;
  description: string | null;
}

export default function HariLibur() {
  const [holidayList, setHolidayList] = useState<HariLibur[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ date: '', name: '', description: '' });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  usePageTitle('Hari Libur');

  useEffect(() => {
    loadHolidays();
  }, []);

  const loadHolidays = async () => {
    try {
      const { data, error } = await supabase
        .from('holidays')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;
      setHolidayList(data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Gagal memuat data hari libur',
        variant: 'destructive',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase
        .from('holidays')
        .insert([{
          date: formData.date,
          name: formData.name,
          description: formData.description || null,
        }]);

      if (error) throw error;
      toast({ title: 'Berhasil', description: 'Hari libur berhasil ditambahkan' });
      loadHolidays();
      handleDialogClose();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Gagal menyimpan hari libur',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus hari libur ini?')) return;
    
    try {
      const { error } = await supabase
        .from('holidays')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: 'Berhasil', description: 'Hari libur berhasil dihapus' });
      loadHolidays();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Gagal menghapus hari libur',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormData({ date: '', name: '', description: '' });
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
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold truncate">Hari Libur</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Kelola data hari libur sekolah</p>
          </div>
          <Button onClick={() => setDialogOpen(true)} size="sm" className="self-start sm:self-auto gap-1 sm:gap-2">
            <Plus className="h-4 w-4" />
            <span className="text-xs sm:text-sm hidden sm:inline">Tambah Hari Libur</span>
            <span className="text-xs sm:hidden">Tambah</span>
          </Button>
        </div>

        <Card className="animate-fade-up">
          <CardHeader className="pb-2 sm:pb-4 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-sm sm:text-base">Daftar Hari Libur</CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <div className="space-y-2 sm:space-y-3">
              {holidayList.map((holiday, index) => (
                <div 
                  key={holiday.id} 
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 p-3 sm:p-4 rounded-lg border border-border hover:bg-accent/50 transition-all duration-300 animate-fade-in"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="flex items-start gap-2 sm:gap-4 min-w-0">
                    <div className="p-1.5 sm:p-2 rounded-lg bg-primary/10 shrink-0">
                      <CalendarIcon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm sm:text-base truncate">{holiday.name}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        {new Date(holiday.date).toLocaleDateString('id-ID', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </p>
                      {holiday.description && (
                        <p className="text-xs sm:text-sm text-muted-foreground mt-1 line-clamp-2">{holiday.description}</p>
                      )}
                    </div>
                  </div>
                  <Button size="sm" variant="destructive" className="text-xs h-7 sm:h-8 px-2 sm:px-3 self-start sm:self-auto shrink-0" onClick={() => handleDelete(holiday.id)}>
                    Hapus
                  </Button>
                </div>
              ))}
              {holidayList.length === 0 && (
                <p className="text-center text-muted-foreground py-6 sm:py-8 text-xs sm:text-sm">
                  Belum ada hari libur terdaftar
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
          <DialogContent className="max-w-[95vw] sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base sm:text-lg">Tambah Hari Libur Baru</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
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
                <Label htmlFor="name">Nama Hari Libur</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Hari Kemerdekaan"
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Deskripsi (Opsional)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Deskripsi hari libur"
                  rows={3}
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