import { useState, useEffect, useRef } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { History, Scan, Camera, X, QrCode, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Html5Qrcode } from 'html5-qrcode';
import { supabase } from '@/integrations/supabase/client';
import QRCode from 'qrcode';
import { usePageTitle } from '@/hooks/usePageTitle';

export default function Absensi() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [attendanceSuccess, setAttendanceSuccess] = useState(false);
  const { toast } = useToast();
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerDivId = 'qr-scanner';

  usePageTitle('Absensi');

  useEffect(() => {
    loadProfile();
    loadHistory();
  }, []);

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      setProfile(data);
      
      // Generate QR code for this user
      if (data) {
        const qrData = JSON.stringify({ userId: user.id, nip: data.nip, name: data.full_name });
        const qrUrl = await QRCode.toDataURL(qrData, { width: 300, margin: 2 });
        setQrCodeUrl(qrUrl);
      }
    }
  };

  const loadHistory = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(30);

      if (error) throw error;
      setHistory(data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Gagal memuat riwayat absensi',
        variant: 'destructive',
      });
    }
  };

  const handleScanQR = async (decodedText: string) => {
    setLoading(true);
    try {
      const qrData = JSON.parse(decodedText);
      const today = new Date().toISOString().split('T')[0];
      const now = new Date().toTimeString().split(' ')[0].substring(0, 5);

      // Check existing attendance
      const { data: existingAttendance } = await supabase
        .from('attendance')
        .select('*')
        .eq('user_id', qrData.userId)
        .eq('date', today)
        .maybeSingle();

      if (existingAttendance) {
        // Update check_out
        const { error } = await supabase
          .from('attendance')
          .update({ check_out: now, status: 'hadir' })
          .eq('id', existingAttendance.id);
        
        if (error) throw error;
        
        setAttendanceSuccess(true);
        toast({
          title: 'Absensi Pulang Berhasil! ✅',
          description: `${qrData.name} - Pulang jam ${now}`,
        });
      } else {
        // Create check_in
        const { error } = await supabase
          .from('attendance')
          .insert({
            user_id: qrData.userId,
            date: today,
            check_in: now,
            status: 'hadir',
            type: 'manual'
          });
        
        if (error) throw error;
        
        setAttendanceSuccess(true);
        toast({
          title: 'Absensi Masuk Berhasil! ✅',
          description: `${qrData.name} - Masuk jam ${now}`,
        });
      }

      loadHistory();
      
      // Reset success message after 3 seconds
      setTimeout(() => setAttendanceSuccess(false), 3000);
    } catch (error: any) {
      console.error('Error scanning QR:', error);
      toast({
        title: 'Error',
        description: 'QR Code tidak valid atau gagal memproses absensi',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const startScanner = async () => {
    try {
      setScanning(true);
      const scanner = new Html5Qrcode(scannerDivId);
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        async (decodedText) => {
          await stopScanner();
          await handleScanQR(decodedText);
        },
        undefined
      );
    } catch (error) {
      console.error('Error starting scanner:', error);
      toast({
        title: 'Error',
        description: 'Gagal mengakses kamera',
        variant: 'destructive',
      });
      setScanning(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
        scannerRef.current = null;
      } catch (error) {
        console.error('Error stopping scanner:', error);
      }
    }
    setScanning(false);
  };

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, string> = {
      hadir: 'bg-green-500/10 text-green-600',
      izin: 'bg-yellow-500/10 text-yellow-600',
      sakit: 'bg-blue-500/10 text-blue-600',
      alpha: 'bg-red-500/10 text-red-600',
    };
    return statusConfig[status] || 'bg-muted text-muted-foreground';
  };

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6">
        <div className="animate-fade-in">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Absensi Guru & Staf</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Absensi dengan scan QR Code</p>
        </div>

        <Tabs defaultValue="qrcode" className="space-y-3 sm:space-y-4">
          <TabsList className="grid w-full grid-cols-2 h-auto">
            <TabsTrigger value="qrcode" className="gap-1 sm:gap-2 text-xs sm:text-sm py-2">
              <QrCode className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="truncate">QR Code</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-1 sm:gap-2 text-xs sm:text-sm py-2">
              <History className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="truncate">Riwayat</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="qrcode">
            <Card className="animate-fade-up">
              <CardHeader className="px-3 sm:px-6 pb-2 sm:pb-4">
                <CardTitle className="text-base sm:text-lg">QR Code Absensi Anda</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Tunjukkan QR Code ini untuk absensi
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center space-y-3 sm:space-y-4 px-3 sm:px-6">
                {qrCodeUrl && (
                  <div className="p-2 sm:p-4 bg-white rounded-lg shadow-lg">
                    <img src={qrCodeUrl} alt="QR Code" className="w-48 h-48 sm:w-64 sm:h-64" />
                  </div>
                )}
                <div className="text-center">
                  <p className="font-semibold text-base sm:text-lg truncate max-w-[200px] sm:max-w-none">{profile?.full_name}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">NIP: {profile?.nip}</p>
                  <p className="text-xs text-muted-foreground capitalize">{profile?.role}</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card className="animate-fade-up">
              <CardHeader className="px-3 sm:px-6 pb-2 sm:pb-4">
                <CardTitle className="text-base sm:text-lg">Riwayat Absensi</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  30 hari terakhir
                </CardDescription>
              </CardHeader>
              <CardContent className="px-3 sm:px-6">
                {history.length > 0 ? (
                  <div className="space-y-2">
                    {history.map((item, index) => (
                      <div
                        key={item.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 border rounded-lg hover:bg-accent/50 transition-all duration-300 animate-fade-in gap-2"
                        style={{ animationDelay: `${index * 0.05}s` }}
                      >
                        <div className="min-w-0">
                          <p className="font-semibold text-sm sm:text-base truncate">
                            {new Date(item.date).toLocaleDateString('id-ID', {
                              weekday: 'short',
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </p>
                          <div className="flex gap-3 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                            <span>Masuk: {item.check_in?.slice(0, 5) || '-'}</span>
                            <span>Pulang: {item.check_out?.slice(0, 5) || '-'}</span>
                          </div>
                        </div>
                        <div className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm capitalize self-start sm:self-auto ${getStatusBadge(item.status)}`}>
                          {item.status}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-6 sm:py-8 text-sm">
                    Belum ada riwayat absensi
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
