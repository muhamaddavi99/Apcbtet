import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { usePageTitle } from '@/hooks/usePageTitle';
import { FileText, Users, Calendar, Printer, Download } from 'lucide-react';
import jsPDF from 'jspdf';

export default function CetakDokumen() {
  usePageTitle('Cetak Dokumen');
  const [classes, setClasses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [loading, setLoading] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    loadClasses();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      loadStudentsByClass(selectedClass);
    }
  }, [selectedClass]);

  const loadClasses = async () => {
    const { data } = await supabase.from('classes').select('*').order('name');
    setClasses(data || []);
  };

  const loadStudentsByClass = async (classId: string) => {
    const { data } = await supabase
      .from('students')
      .select('*')
      .eq('class_id', classId)
      .order('name');
    setStudents(data || []);
  };

  const generateDaftarHadir = async () => {
    if (!selectedClass) {
      toast({ title: 'Error', description: 'Pilih kelas terlebih dahulu', variant: 'destructive' });
      return;
    }

    setLoading('daftar-hadir');
    try {
      const kelas = classes.find(k => k.id === selectedClass);
      const { data: studentsData } = await supabase
        .from('students')
        .select('*')
        .eq('class_id', selectedClass)
        .order('name');

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Header
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('DAFTAR HADIR SISWA', pageWidth / 2, 20, { align: 'center' });
      doc.setFontSize(12);
      doc.text(`MA AL-ITTIFAQIAH 2`, pageWidth / 2, 28, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.text(`Kelas: ${kelas?.name || '-'}`, pageWidth / 2, 36, { align: 'center' });
      doc.text(`Tahun Ajaran: ${kelas?.academic_year || '-'}`, pageWidth / 2, 42, { align: 'center' });

      // Table headers
      let y = 55;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.rect(14, y - 5, 182, 10);
      doc.text('No', 18, y);
      doc.text('NIS', 30, y);
      doc.text('Nama Siswa', 55, y);
      doc.text('L/P', 110, y);
      doc.text('Tanda Tangan', 140, y);

      // Table content
      y += 10;
      doc.setFont('helvetica', 'normal');
      (studentsData || []).forEach((student, index) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        doc.rect(14, y - 5, 182, 10);
        doc.text(String(index + 1), 18, y);
        doc.text(student.nis, 30, y);
        doc.text(student.name, 55, y);
        doc.text(student.gender === 'L' ? 'L' : 'P', 112, y);
        y += 10;
      });

      // Footer
      y += 15;
      const today = new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
      doc.text(`Tanggal: ${today}`, 140, y);
      y += 20;
      doc.text('Wali Kelas,', 150, y);
      y += 25;
      doc.text('(_________________)', 140, y);

      doc.save(`Daftar_Hadir_${kelas?.name || 'Kelas'}.pdf`);
      toast({ title: 'Berhasil', description: 'Dokumen berhasil diunduh' });
    } catch (error) {
      toast({ title: 'Error', description: 'Gagal membuat dokumen', variant: 'destructive' });
    } finally {
      setLoading('');
    }
  };

  const generateSuratKeterangan = async () => {
    if (!selectedStudent) {
      toast({ title: 'Error', description: 'Pilih siswa terlebih dahulu', variant: 'destructive' });
      return;
    }

    setLoading('surat-keterangan');
    try {
      const student = students.find(s => s.id === selectedStudent);
      const kelas = classes.find(k => k.id === selectedClass);

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();

      // Header
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('MADRASAH ALIYAH AL-ITTIFAQIAH 2', pageWidth / 2, 25, { align: 'center' });
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Alamat: Jl. Pendidikan No. 1, Kota', pageWidth / 2, 32, { align: 'center' });
      
      doc.line(14, 38, 196, 38);
      doc.line(14, 39, 196, 39);

      // Title
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('SURAT KETERANGAN AKTIF', pageWidth / 2, 55, { align: 'center' });
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Nomor: ___/MA-AIT/${new Date().getFullYear()}`, pageWidth / 2, 62, { align: 'center' });

      // Content
      let y = 80;
      doc.text('Yang bertanda tangan di bawah ini, Kepala MA Al-Ittifaqiah 2 menerangkan bahwa:', 14, y);
      
      y += 15;
      doc.text(`Nama`, 20, y);
      doc.text(`: ${student?.name || '-'}`, 55, y);
      y += 8;
      doc.text(`NIS`, 20, y);
      doc.text(`: ${student?.nis || '-'}`, 55, y);
      y += 8;
      doc.text(`Tempat, Tgl. Lahir`, 20, y);
      doc.text(`: ${student?.birth_date ? new Date(student.birth_date).toLocaleDateString('id-ID') : '-'}`, 55, y);
      y += 8;
      doc.text(`Jenis Kelamin`, 20, y);
      doc.text(`: ${student?.gender === 'L' ? 'Laki-laki' : 'Perempuan'}`, 55, y);
      y += 8;
      doc.text(`Kelas`, 20, y);
      doc.text(`: ${kelas?.name || '-'}`, 55, y);
      y += 8;
      doc.text(`Alamat`, 20, y);
      doc.text(`: ${student?.address || '-'}`, 55, y);

      y += 20;
      doc.text(`Adalah benar siswa aktif di MA Al-Ittifaqiah 2 pada tahun ajaran ${kelas?.academic_year || '-'}.`, 14, y);
      y += 8;
      doc.text('Demikian surat keterangan ini dibuat untuk dapat dipergunakan sebagaimana mestinya.', 14, y);

      // Signature
      y += 25;
      const today = new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
      doc.text(`Kota, ${today}`, 130, y);
      y += 8;
      doc.text('Kepala Madrasah,', 130, y);
      y += 30;
      doc.text('(_________________)', 130, y);
      y += 6;
      doc.text('NIP. _______________', 130, y);

      doc.save(`Surat_Keterangan_${student?.name || 'Siswa'}.pdf`);
      toast({ title: 'Berhasil', description: 'Surat keterangan berhasil diunduh' });
    } catch (error) {
      toast({ title: 'Error', description: 'Gagal membuat dokumen', variant: 'destructive' });
    } finally {
      setLoading('');
    }
  };

  const generateRekapAbsensi = async () => {
    if (!selectedClass) {
      toast({ title: 'Error', description: 'Pilih kelas terlebih dahulu', variant: 'destructive' });
      return;
    }

    setLoading('rekap-absensi');
    try {
      const kelas = classes.find(k => k.id === selectedClass);
      const { data: attendanceData } = await supabase
        .from('student_attendance')
        .select('*, students(name, nis)')
        .eq('class_id', selectedClass)
        .order('date', { ascending: false })
        .limit(100);

      const doc = new jsPDF('landscape');
      const pageWidth = doc.internal.pageSize.getWidth();

      // Header
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('REKAP ABSENSI SISWA', pageWidth / 2, 20, { align: 'center' });
      doc.setFontSize(12);
      doc.text(`MA AL-ITTIFAQIAH 2`, pageWidth / 2, 28, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.text(`Kelas: ${kelas?.name || '-'}`, pageWidth / 2, 36, { align: 'center' });

      // Table
      let y = 50;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.rect(14, y - 5, 269, 10);
      doc.text('No', 18, y);
      doc.text('NIS', 30, y);
      doc.text('Nama Siswa', 55, y);
      doc.text('Tanggal', 130, y);
      doc.text('Status', 175, y);
      doc.text('Keterangan', 210, y);

      y += 10;
      doc.setFont('helvetica', 'normal');
      (attendanceData || []).forEach((att, index) => {
        if (y > 190) {
          doc.addPage();
          y = 20;
        }
        doc.rect(14, y - 5, 269, 10);
        doc.text(String(index + 1), 18, y);
        doc.text(att.students?.nis || '-', 30, y);
        doc.text(att.students?.name || '-', 55, y);
        doc.text(new Date(att.date).toLocaleDateString('id-ID'), 130, y);
        doc.text(att.status || '-', 175, y);
        doc.text(att.notes || '-', 210, y);
        y += 10;
      });

      doc.save(`Rekap_Absensi_${kelas?.name || 'Kelas'}.pdf`);
      toast({ title: 'Berhasil', description: 'Rekap absensi berhasil diunduh' });
    } catch (error) {
      toast({ title: 'Error', description: 'Gagal membuat dokumen', variant: 'destructive' });
    } finally {
      setLoading('');
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Cetak Dokumen</h1>
          <p className="text-muted-foreground">Cetak berbagai dokumen ke format PDF</p>
        </div>

        {/* Filter Section */}
        <Card>
          <CardHeader>
            <CardTitle>Pilih Kelas & Siswa</CardTitle>
            <CardDescription>Pilih kelas untuk mencetak dokumen terkait</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
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
                <Label>Siswa (untuk surat keterangan)</Label>
                <Select value={selectedStudent} onValueChange={setSelectedStudent} disabled={!selectedClass}>
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
            </div>
          </CardContent>
        </Card>

        {/* Document Types */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Daftar Hadir</CardTitle>
                  <CardDescription>Cetak daftar hadir siswa per kelas</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button 
                className="w-full" 
                onClick={generateDaftarHadir}
                disabled={!selectedClass || loading === 'daftar-hadir'}
              >
                {loading === 'daftar-hadir' ? (
                  'Membuat...'
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Unduh PDF
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-500/10 rounded-lg">
                  <FileText className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Surat Keterangan</CardTitle>
                  <CardDescription>Cetak surat keterangan aktif siswa</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button 
                className="w-full" 
                onClick={generateSuratKeterangan}
                disabled={!selectedStudent || loading === 'surat-keterangan'}
              >
                {loading === 'surat-keterangan' ? (
                  'Membuat...'
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Unduh PDF
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-500/10 rounded-lg">
                  <Calendar className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Rekap Absensi</CardTitle>
                  <CardDescription>Cetak rekap kehadiran siswa</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button 
                className="w-full" 
                onClick={generateRekapAbsensi}
                disabled={!selectedClass || loading === 'rekap-absensi'}
              >
                {loading === 'rekap-absensi' ? (
                  'Membuat...'
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Unduh PDF
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
