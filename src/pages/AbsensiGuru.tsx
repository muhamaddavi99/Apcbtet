import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Calendar, CheckCircle, XCircle, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { usePageTitle } from '@/hooks/usePageTitle';

interface AbsensiGuru {
  id: string;
  user_id: string;
  date: string;
  status: string;
  check_in: string | null;
  check_out: string | null;
  profiles?: {
    full_name: string;
  };
}

export default function AbsensiGuru() {
  const [absensiList, setAbsensiList] = useState<AbsensiGuru[]>([]);
  const [todayAbsensi, setTodayAbsensi] = useState<AbsensiGuru[]>([]);
  const { toast } = useToast();

  usePageTitle('Absensi Guru');

  useEffect(() => {
    loadAbsensi();
  }, []);

  const loadAbsensi = async () => {
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select(`
          *,
          profiles (
            full_name
          )
        `)
        .order('date', { ascending: false })
        .order('check_in', { ascending: false });

      if (error) throw error;
      setAbsensiList(data || []);
      
      // Filter absensi hari ini
      const today = new Date().toISOString().split('T')[0];
      const todayData = (data || []).filter((item: AbsensiGuru) => item.date === today);
      setTodayAbsensi(todayData);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Gagal memuat data absensi guru',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'hadir':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-success/10 text-success">
            <CheckCircle className="mr-1 h-3 w-3" />
            Hadir
          </span>
        );
      case 'alpha':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-destructive/10 text-destructive">
            <XCircle className="mr-1 h-3 w-3" />
            Alpha
          </span>
        );
      case 'izin':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
            <Clock className="mr-1 h-3 w-3" />
            Izin
          </span>
        );
      case 'sakit':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
            <Clock className="mr-1 h-3 w-3" />
            Sakit
          </span>
        );
      default:
        return status;
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Absensi Guru & Staf</h1>
          <p className="text-muted-foreground">Riwayat kehadiran guru dan staf</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="mr-2 h-5 w-5" />
              Absensi Hari Ini
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {todayAbsensi.map((absensi) => (
                <div key={absensi.id} className="flex items-center justify-between p-4 rounded-lg border border-border">
                  <div>
                    <p className="font-semibold">{absensi.profiles?.full_name || 'Unknown'}</p>
                    <p className="text-sm text-muted-foreground">
                      {absensi.check_in && `Masuk: ${absensi.check_in}`}
                      {absensi.check_out && ` | Pulang: ${absensi.check_out}`}
                    </p>
                  </div>
                  {getStatusBadge(absensi.status || 'alpha')}
                </div>
              ))}
              {todayAbsensi.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  Belum ada data absensi hari ini
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Riwayat Absensi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {absensiList.map((absensi) => (
                <div key={absensi.id} className="flex items-center justify-between p-4 rounded-lg border border-border">
                  <div>
                    <p className="font-semibold">{absensi.profiles?.full_name || 'Unknown'}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(absensi.date).toLocaleDateString('id-ID', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {absensi.check_in && `Masuk: ${absensi.check_in}`}
                      {absensi.check_out && ` | Pulang: ${absensi.check_out}`}
                    </p>
                  </div>
                  {getStatusBadge(absensi.status || 'alpha')}
                </div>
              ))}
              {absensiList.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  Belum ada riwayat absensi
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}