import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Plus, QrCode, Printer, FileDown, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { generateQRCardsPDF } from '@/utils/generateQRCardsPDF';
import { usePageTitle } from '@/hooks/usePageTitle';

interface Siswa {
  id: string;
  nis: string;
  name: string;
  phone: string | null;
  class_id: string | null;
  gender: string | null;
  birth_date: string | null;
  address: string | null;
}

interface Kelas {
  id: string;
  name: string;
}

export default function Siswa() {
  const [siswaList, setSiswaList] = useState<Siswa[]>([]);
  const [kelasList, setKelasList] = useState<Kelas[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [qrDialog, setQrDialog] = useState(false);
  const [selectedSiswa, setSelectedSiswa] = useState<Siswa | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [currentSiswa, setCurrentSiswa] = useState<Siswa | null>(null);
  const [filterKelas, setFilterKelas] = useState<string>('all');

  usePageTitle('Data Siswa');
  const [formData, setFormData] = useState({
    nis: '',
    name: '',
    phone: '',
    class_id: '',
    gender: '',
    birth_date: '',
    address: '',
  });
  const [loading, setLoading] = useState(false);
  const [printingPDF, setPrintingPDF] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadSiswa();
    loadKelas();
  }, []);

  const filteredSiswa = filterKelas === 'all' 
    ? siswaList 
    : siswaList.filter(s => s.class_id === filterKelas);

  const loadSiswa = async () => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .order('name');

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Convert empty strings to null for optional fields
      const cleanedData = {
        ...formData,
        phone: formData.phone || null,
        class_id: formData.class_id || null,
        gender: formData.gender || null,
        birth_date: formData.birth_date || null,
        address: formData.address || null,
      };

      if (editMode && currentSiswa) {
        const { error } = await supabase
          .from('students')
          .update(cleanedData)
          .eq('id', currentSiswa.id);

        if (error) throw error;
        toast({ title: 'Berhasil', description: 'Data siswa berhasil diperbarui' });
      } else {
        const { error } = await supabase
          .from('students')
          .insert([cleanedData]);

        if (error) throw error;
        toast({ title: 'Berhasil', description: 'Siswa berhasil ditambahkan' });
      }
      loadSiswa();
      handleDialogClose();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Gagal menyimpan data siswa',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (siswa: Siswa) => {
    setCurrentSiswa(siswa);
    setFormData({
      nis: siswa.nis,
      name: siswa.name,
      phone: siswa.phone || '',
      class_id: siswa.class_id || '',
      gender: siswa.gender || '',
      birth_date: siswa.birth_date || '',
      address: siswa.address || '',
    });
    setEditMode(true);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus siswa ini?')) return;
    
    try {
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: 'Berhasil', description: 'Siswa berhasil dihapus' });
      loadSiswa();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Gagal menghapus siswa',
        variant: 'destructive',
      });
    }
  };

  const showQRCode = (siswa: Siswa) => {
    setSelectedSiswa(siswa);
    setQrDialog(true);
  };

  const handlePrintQR = () => {
    window.print();
  };

  const resetForm = () => {
    setFormData({ nis: '', name: '', phone: '', class_id: '', gender: '', birth_date: '', address: '' });
    setCurrentSiswa(null);
    setEditMode(false);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    resetForm();
  };

  const getClassName = (classId: string | null) => {
    if (!classId) return 'Belum ditentukan';
    const kelas = kelasList.find(k => k.id === classId);
    return kelas?.name || 'Belum ditentukan';
  };

  const handlePrintAllQR = async () => {
    if (filteredSiswa.length === 0) {
      toast({
        title: 'Tidak ada data',
        description: 'Tidak ada siswa untuk dicetak',
        variant: 'destructive',
      });
      return;
    }

    setPrintingPDF(true);
    try {
      await generateQRCardsPDF(filteredSiswa, kelasList);
      toast({
        title: 'Berhasil',
        description: `PDF kartu QR untuk ${filteredSiswa.length} siswa berhasil dibuat`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Gagal membuat PDF',
        variant: 'destructive',
      });
    } finally {
      setPrintingPDF(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">Data Siswa</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Kelola data siswa dan QR code absensi</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="text-xs sm:text-sm" onClick={handlePrintAllQR} disabled={printingPDF || filteredSiswa.length === 0}>
              {printingPDF ? (
                <>
                  <Loader2 className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                  <span className="hidden sm:inline">Membuat PDF...</span>
                  <span className="sm:hidden">PDF...</span>
                </>
              ) : (
                <>
                  <FileDown className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Cetak Semua QR</span>
                  <span className="sm:hidden">QR</span>
                </>
              )}
            </Button>
            <Button size="sm" className="text-xs sm:text-sm" onClick={() => setDialogOpen(true)}>
              <Plus className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Tambah Siswa</span>
              <span className="sm:hidden">Tambah</span>
            </Button>
          </div>
        </div>

        {/* Filter Kelas */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
          <Label className="text-xs sm:text-sm font-medium">Filter Kelas:</Label>
          <Select value={filterKelas} onValueChange={setFilterKelas}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Semua Kelas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Kelas ({siswaList.length})</SelectItem>
              {kelasList.map((kelas) => {
                const count = siswaList.filter(s => s.class_id === kelas.id).length;
                return (
                  <SelectItem key={kelas.id} value={kelas.id}>
                    {kelas.name} ({count})
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          {filterKelas !== 'all' && (
            <span className="text-xs sm:text-sm text-muted-foreground">
              Menampilkan {filteredSiswa.length} siswa
            </span>
          )}
        </div>

        <div className="grid gap-3 sm:gap-4">
          {filteredSiswa.map((siswa) => (
            <Card key={siswa.id}>
              <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                  <div className="space-y-0.5 sm:space-y-1 min-w-0">
                    <h3 className="font-semibold text-sm sm:text-base md:text-lg truncate">{siswa.name}</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground">NIS: {siswa.nis}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">Kelas: {getClassName(siswa.class_id)}</p>
                    {siswa.phone && <p className="text-xs sm:text-sm text-muted-foreground">Tel: {siswa.phone}</p>}
                  </div>
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    <Button size="sm" variant="outline" className="text-xs h-7 sm:h-8 px-2 sm:px-3" onClick={() => showQRCode(siswa)}>
                      <QrCode className="mr-1 h-3 w-3 sm:h-4 sm:w-4" />
                      QR
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs h-7 sm:h-8 px-2 sm:px-3" onClick={() => handleEdit(siswa)}>
                      Edit
                    </Button>
                    <Button size="sm" variant="destructive" className="text-xs h-7 sm:h-8 px-2 sm:px-3" onClick={() => handleDelete(siswa.id)}>
                      Hapus
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {filteredSiswa.length === 0 && (
            <Card>
              <CardContent className="py-8 sm:py-12 text-center text-xs sm:text-sm text-muted-foreground">
                {filterKelas === 'all' ? 'Belum ada data siswa' : 'Tidak ada siswa di kelas ini'}
              </CardContent>
            </Card>
          )}
        </div>

        <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editMode ? 'Edit Siswa' : 'Tambah Siswa Baru'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="nis">NIS</Label>
                <Input
                  id="nis"
                  value={formData.nis}
                  onChange={(e) => setFormData({ ...formData, nis: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="name">Nama Lengkap</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="phone">Telepon</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="class_id">Kelas</Label>
                <Select value={formData.class_id} onValueChange={(value) => setFormData({ ...formData, class_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih kelas" />
                  </SelectTrigger>
                  <SelectContent>
                    {kelasList.map((kelas) => (
                      <SelectItem key={kelas.id} value={kelas.id}>
                        {kelas.name}
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

        <Dialog open={qrDialog} onOpenChange={setQrDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>QR Code - {selectedSiswa?.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex flex-col items-center justify-center p-8 bg-secondary rounded-lg">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${selectedSiswa?.id}`}
                  alt="QR Code"
                  className="w-48 h-48"
                />
                <p className="mt-4 font-semibold">{selectedSiswa?.name}</p>
                <p className="text-sm text-muted-foreground">NIS: {selectedSiswa?.nis}</p>
              </div>
              <Button onClick={handlePrintQR} className="w-full">
                <Printer className="mr-2 h-4 w-4" />
                Print QR Code
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
