import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Download, FileSpreadsheet } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import * as XLSX from 'xlsx';
import { usePageTitle } from '@/hooks/usePageTitle';

interface Kelas {
  id: string;
  name: string;
}

export default function RekapAbsensi() {
  const [kelasList, setKelasList] = useState<Kelas[]>([]);
  const [selectedKelas, setSelectedKelas] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  usePageTitle('Rekap Absensi');

  useEffect(() => {
    loadKelas();
    // Set default dates (current month)
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    setStartDate(firstDay.toISOString().split('T')[0]);
    setEndDate(lastDay.toISOString().split('T')[0]);
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

  const exportGuruToExcel = async () => {
    if (!startDate || !endDate) {
      toast({
        title: 'Error',
        description: 'Silakan pilih tanggal mulai dan selesai',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      // Fetch attendance data
      const { data: attendanceData, error } = await supabase
        .from('attendance')
        .select(`
          *,
          profiles (
            full_name,
            nip,
            role
          )
        `)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true });

      if (error) throw error;

      // Transform data for Excel
      const excelData = (attendanceData || []).map((record: any) => ({
        'Tanggal': new Date(record.date).toLocaleDateString('id-ID'),
        'NIP': record.profiles?.nip || '',
        'Nama': record.profiles?.full_name || '',
        'Role': record.profiles?.role === 'teacher' ? 'Guru' : 'Staf',
        'Status': record.status?.toUpperCase() || 'ALPHA',
        'Jam Masuk': record.check_in || '-',
        'Jam Keluar': record.check_out || '-',
      }));

      // Create worksheet
      const ws = XLSX.utils.json_to_sheet(excelData);
      
      // Set column widths
      ws['!cols'] = [
        { wch: 15 }, // Tanggal
        { wch: 15 }, // NIP
        { wch: 25 }, // Nama
        { wch: 10 }, // Role
        { wch: 10 }, // Status
        { wch: 12 }, // Jam Masuk
        { wch: 12 }, // Jam Keluar
      ];

      // Create workbook
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Rekap Absensi Guru');

      // Generate filename
      const filename = `Rekap_Absensi_Guru_${startDate}_${endDate}.xlsx`;

      // Download
      XLSX.writeFile(wb, filename);

      toast({
        title: 'Berhasil',
        description: 'File Excel berhasil diunduh',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Gagal mengexport data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const exportSiswaToExcel = async () => {
    if (!selectedKelas) {
      toast({
        title: 'Error',
        description: 'Silakan pilih kelas',
        variant: 'destructive',
      });
      return;
    }

    if (!startDate || !endDate) {
      toast({
        title: 'Error',
        description: 'Silakan pilih tanggal mulai dan selesai',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      // Get class name
      const { data: kelasData } = await supabase
        .from('classes')
        .select('name')
        .eq('id', selectedKelas)
        .single();

      // Fetch student attendance data
      const { data: attendanceData, error } = await supabase
        .from('student_attendance')
        .select(`
          *,
          students (
            nis,
            name
          )
        `)
        .eq('class_id', selectedKelas)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true });

      if (error) throw error;

      // Transform data for Excel
      const excelData = (attendanceData || []).map((record: any) => ({
        'Tanggal': new Date(record.date).toLocaleDateString('id-ID'),
        'NIS': record.students?.nis || '',
        'Nama': record.students?.name || '',
        'Status': record.status?.toUpperCase() || 'ALPHA',
        'Catatan': record.notes || '-',
      }));

      // Create worksheet
      const ws = XLSX.utils.json_to_sheet(excelData);
      
      // Set column widths
      ws['!cols'] = [
        { wch: 15 }, // Tanggal
        { wch: 15 }, // NIS
        { wch: 25 }, // Nama
        { wch: 10 }, // Status
        { wch: 30 }, // Catatan
      ];

      // Create workbook
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `Rekap ${kelasData?.name || 'Kelas'}`);

      // Generate filename
      const filename = `Rekap_Absensi_${kelasData?.name || 'Kelas'}_${startDate}_${endDate}.xlsx`;

      // Download
      XLSX.writeFile(wb, filename);

      toast({
        title: 'Berhasil',
        description: 'File Excel berhasil diunduh',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Gagal mengexport data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">Rekap Absensi</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Export data absensi ke format Excel</p>
        </div>

        {/* Rekap Guru & Staf */}
        <Card>
          <CardHeader className="pb-2 sm:pb-4 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="flex items-center text-sm sm:text-base">
              <FileSpreadsheet className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
              Rekap Absensi Guru & Staf
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4 px-3 sm:px-6 pb-3 sm:pb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <Label htmlFor="start-date-guru" className="text-xs sm:text-sm">Tanggal Mulai</Label>
                <Input
                  id="start-date-guru"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="text-xs sm:text-sm h-8 sm:h-10"
                />
              </div>
              <div>
                <Label htmlFor="end-date-guru" className="text-xs sm:text-sm">Tanggal Selesai</Label>
                <Input
                  id="end-date-guru"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="text-xs sm:text-sm h-8 sm:h-10"
                />
              </div>
            </div>
            <Button 
              onClick={exportGuruToExcel} 
              disabled={loading}
              size="sm"
              className="w-full sm:w-auto text-xs sm:text-sm"
            >
              <Download className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              {loading ? 'Mengunduh...' : 'Download Excel - Semua Guru'}
            </Button>
          </CardContent>
        </Card>

        {/* Rekap Siswa */}
        <Card>
          <CardHeader className="pb-2 sm:pb-4 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="flex items-center text-sm sm:text-base">
              <FileSpreadsheet className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
              Rekap Absensi Siswa
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4 px-3 sm:px-6 pb-3 sm:pb-6">
            <div>
              <Label htmlFor="kelas" className="text-xs sm:text-sm">Pilih Kelas</Label>
              <Select value={selectedKelas} onValueChange={setSelectedKelas}>
                <SelectTrigger className="text-xs sm:text-sm h-8 sm:h-10">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <Label htmlFor="start-date-siswa" className="text-xs sm:text-sm">Tanggal Mulai</Label>
                <Input
                  id="start-date-siswa"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="text-xs sm:text-sm h-8 sm:h-10"
                />
              </div>
              <div>
                <Label htmlFor="end-date-siswa" className="text-xs sm:text-sm">Tanggal Selesai</Label>
                <Input
                  id="end-date-siswa"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="text-xs sm:text-sm h-8 sm:h-10"
                />
              </div>
            </div>
            <Button 
              onClick={exportSiswaToExcel} 
              disabled={loading || !selectedKelas}
              size="sm"
              className="w-full sm:w-auto text-xs sm:text-sm"
            >
              <Download className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              {loading ? 'Mengunduh...' : 'Download Excel - Per Kelas'}
            </Button>
          </CardContent>
        </Card>

        {/* Info */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6 pb-3 sm:pb-6">
            <h3 className="font-semibold mb-2 text-xs sm:text-sm">Informasi:</h3>
            <ul className="list-disc list-inside space-y-0.5 sm:space-y-1 text-xs sm:text-sm text-muted-foreground">
              <li>File Excel akan otomatis terunduh setelah klik download</li>
              <li>Rekap guru mencakup semua guru dan staf</li>
              <li>Rekap siswa menampilkan data per kelas</li>
              <li>Format tanggal: DD/MM/YYYY</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
