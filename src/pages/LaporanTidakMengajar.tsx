import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { usePageTitle } from '@/hooks/usePageTitle';
import Layout from '@/components/Layout';
import { FileWarning, Calendar, Search, Loader2, RefreshCw, Download } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { id } from 'date-fns/locale';
import { toast } from 'sonner';

interface NoTeachRecord {
  id: string;
  teacher_id: string;
  schedule_id: string;
  date: string;
  class_id: string;
  subject_id: string;
  reason: string;
  created_at: string;
  teacher?: {
    full_name: string;
    avatar_url: string | null;
    nip: string;
  };
  classes?: {
    name: string;
    grade: string;
  };
  subjects?: {
    name: string;
    code: string;
  };
}

export default function LaporanTidakMengajar() {
  const [records, setRecords] = useState<NoTeachRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [searchQuery, setSearchQuery] = useState('');
  const [runningCheck, setRunningCheck] = useState(false);

  usePageTitle('Laporan Guru Tidak Mengajar');

  useEffect(() => {
    loadRecords();
  }, [startDate, endDate]);

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel('no-teach-records')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'teacher_no_teach_records',
        },
        () => {
          loadRecords();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [startDate, endDate]);

  const loadRecords = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('teacher_no_teach_records')
        .select(`
          *,
          teacher:profiles!teacher_no_teach_records_teacher_id_fkey(full_name, avatar_url, nip),
          classes(name, grade),
          subjects(name, code)
        `)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false });

      if (error) throw error;
      setRecords(data || []);
    } catch (error) {
      console.error('Error loading records:', error);
      toast.error('Gagal memuat data');
    } finally {
      setLoading(false);
    }
  };

  const runManualCheck = async () => {
    try {
      setRunningCheck(true);
      const { data, error } = await supabase.functions.invoke('mark-teachers-not-teaching');
      
      if (error) throw error;
      
      toast.success(data.message || 'Pengecekan selesai');
      loadRecords();
    } catch (error: any) {
      console.error('Error running check:', error);
      toast.error(error.message || 'Gagal menjalankan pengecekan');
    } finally {
      setRunningCheck(false);
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const filteredRecords = records.filter(record => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      record.teacher?.full_name.toLowerCase().includes(query) ||
      record.teacher?.nip.toLowerCase().includes(query) ||
      record.classes?.name.toLowerCase().includes(query) ||
      record.subjects?.name.toLowerCase().includes(query)
    );
  });

  // Group by teacher for summary
  const teacherSummary = records.reduce((acc, record) => {
    const teacherId = record.teacher_id;
    if (!acc[teacherId]) {
      acc[teacherId] = {
        teacher: record.teacher,
        count: 0,
      };
    }
    acc[teacherId].count++;
    return acc;
  }, {} as Record<string, { teacher: NoTeachRecord['teacher']; count: number }>);

  const sortedSummary = Object.values(teacherSummary).sort((a, b) => b.count - a.count);

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileWarning className="h-6 w-6 text-destructive" />
              Laporan Guru Tidak Mengajar
            </h1>
            <p className="text-muted-foreground">
              Rekap data guru yang tidak memulai sesi mengajar
            </p>
          </div>
          <Button onClick={runManualCheck} disabled={runningCheck}>
            {runningCheck ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Jalankan Pengecekan
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">Tanggal Mulai</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">Tanggal Akhir</label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">Cari</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Nama guru, kelas, mapel..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary */}
        {sortedSummary.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Ringkasan per Guru</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {sortedSummary.slice(0, 6).map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={item.teacher?.avatar_url || ''} />
                      <AvatarFallback className="text-xs">
                        {item.teacher ? getInitials(item.teacher.full_name) : '??'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {item.teacher?.full_name || 'Unknown'}
                      </p>
                      <Badge variant="destructive" className="text-xs">
                        {item.count}x tidak mengajar
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Detail Data ({filteredRecords.length} catatan)</span>
              <Badge variant="outline">
                <Calendar className="h-3 w-3 mr-1" />
                {format(new Date(startDate), 'd MMM', { locale: id })} - {format(new Date(endDate), 'd MMM yyyy', { locale: id })}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileWarning className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p>Tidak ada data untuk periode ini</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Guru</TableHead>
                      <TableHead>NIP</TableHead>
                      <TableHead>Kelas</TableHead>
                      <TableHead>Mata Pelajaran</TableHead>
                      <TableHead>Keterangan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>
                          {format(new Date(record.date), 'EEEE, d MMM yyyy', { locale: id })}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={record.teacher?.avatar_url || ''} />
                              <AvatarFallback className="text-xs">
                                {record.teacher ? getInitials(record.teacher.full_name) : '??'}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">
                              {record.teacher?.full_name || 'Unknown'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {record.teacher?.nip || '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {record.classes?.grade} - {record.classes?.name}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {record.subjects?.name || '-'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-destructive">
                          {record.reason}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
