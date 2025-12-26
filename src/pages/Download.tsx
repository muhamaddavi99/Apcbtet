import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Download, Smartphone, Shield, CheckCircle2, AlertTriangle, ArrowLeft, Apple } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useSchoolSettings } from '@/contexts/SchoolContext';
import { usePageTitle } from '@/hooks/usePageTitle';

interface AppVersion {
  id: string;
  version_code: number;
  version_name: string;
  release_notes: string | null;
  download_url: string | null;
  is_force_update: boolean | null;
  is_active: boolean | null;
  platform: string | null;
  created_at: string;
}

export default function DownloadPage() {
  const navigate = useNavigate();
  const { settings } = useSchoolSettings();
  usePageTitle('Download Aplikasi');
  const [androidVersion, setAndroidVersion] = useState<AppVersion | null>(null);
  const [iosVersion, setIosVersion] = useState<AppVersion | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLatestVersions();
  }, []);

  const fetchLatestVersions = async () => {
    try {
      const { data: androidData } = await supabase
        .from('app_versions')
        .select('*')
        .eq('platform', 'android')
        .eq('is_active', true)
        .order('version_code', { ascending: false })
        .limit(1)
        .single();

      const { data: iosData } = await supabase
        .from('app_versions')
        .select('*')
        .eq('platform', 'ios')
        .eq('is_active', true)
        .order('version_code', { ascending: false })
        .limit(1)
        .single();

      setAndroidVersion(androidData);
      setIosVersion(iosData);
    } catch (error) {
      console.error('Error fetching versions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (url: string | null) => {
    if (url) {
      window.open(url, '_blank');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <div className="bg-primary text-primary-foreground py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <Button 
            variant="ghost" 
            className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10 mb-4"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>
          <div className="flex items-center gap-4">
            {settings?.school_icon_url ? (
              <img 
                src={settings.school_icon_url} 
                alt="School Icon" 
                className="w-16 h-16 rounded-2xl bg-white/10 p-1"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center">
                <Smartphone className="w-8 h-8" />
              </div>
            )}
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">
                {settings?.school_name || 'Aplikasi Sekolah'}
              </h1>
              <p className="text-primary-foreground/80">
                Download aplikasi untuk perangkat mobile Anda
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Download Cards */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Android Card */}
          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                    <Smartphone className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">Android</CardTitle>
                    <CardDescription>APK File</CardDescription>
                  </div>
                </div>
                {androidVersion && (
                  <Badge variant="secondary">v{androidVersion.version_name}</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <div className="h-24 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                </div>
              ) : androidVersion ? (
                <>
                  <div className="text-sm text-muted-foreground">
                    <p>Rilis: {formatDate(androidVersion.created_at)}</p>
                    {androidVersion.release_notes && (
                      <p className="mt-2 line-clamp-2">{androidVersion.release_notes}</p>
                    )}
                  </div>
                  <Button 
                    className="w-full gap-2" 
                    size="lg"
                    onClick={() => handleDownload(androidVersion.download_url)}
                    disabled={!androidVersion.download_url}
                  >
                    <Download className="w-5 h-5" />
                    Download APK
                  </Button>
                </>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  <p>Belum ada versi tersedia</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* iOS Card */}
          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gray-500/10 flex items-center justify-center">
                    <Apple className="w-6 h-6 text-gray-600" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">iOS</CardTitle>
                    <CardDescription>iPhone & iPad</CardDescription>
                  </div>
                </div>
                {iosVersion && (
                  <Badge variant="secondary">v{iosVersion.version_name}</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <div className="h-24 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                </div>
              ) : iosVersion ? (
                <>
                  <div className="text-sm text-muted-foreground">
                    <p>Rilis: {formatDate(iosVersion.created_at)}</p>
                    {iosVersion.release_notes && (
                      <p className="mt-2 line-clamp-2">{iosVersion.release_notes}</p>
                    )}
                  </div>
                  <Button 
                    className="w-full gap-2" 
                    size="lg"
                    onClick={() => handleDownload(iosVersion.download_url)}
                    disabled={!iosVersion.download_url}
                  >
                    <Download className="w-5 h-5" />
                    Download
                  </Button>
                </>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  <p>Segera hadir</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Installation Instructions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Panduan Instalasi Android
            </CardTitle>
            <CardDescription>
              Ikuti langkah-langkah berikut untuk menginstal aplikasi di perangkat Android Anda
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="step-1">
                <AccordionTrigger>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                      1
                    </div>
                    <span>Download File APK</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pl-11 space-y-2">
                  <p className="text-muted-foreground">
                    Klik tombol "Download APK" di atas untuk mengunduh file instalasi aplikasi.
                  </p>
                  <div className="flex items-start gap-2 p-3 bg-amber-500/10 rounded-lg text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <p className="text-sm">
                      File APK hanya dapat diinstal di perangkat Android. Pastikan Anda mengunduh menggunakan perangkat Android.
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="step-2">
                <AccordionTrigger>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                      2
                    </div>
                    <span>Izinkan Instalasi dari Sumber Tidak Dikenal</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pl-11 space-y-3">
                  <p className="text-muted-foreground">
                    Android memerlukan izin khusus untuk menginstal aplikasi di luar Play Store:
                  </p>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <span>Buka <strong>Pengaturan</strong> di perangkat Android Anda</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <span>Pilih <strong>Keamanan</strong> atau <strong>Privasi</strong></span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <span>Aktifkan <strong>Sumber tidak dikenal</strong> atau <strong>Instal aplikasi tidak dikenal</strong></span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <span>Pilih browser yang Anda gunakan untuk download (Chrome, dll)</span>
                    </li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="step-3">
                <AccordionTrigger>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                      3
                    </div>
                    <span>Instal Aplikasi</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pl-11 space-y-3">
                  <p className="text-muted-foreground">
                    Setelah file selesai diunduh:
                  </p>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <span>Buka notifikasi download atau folder <strong>Downloads</strong></span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <span>Ketuk file APK yang sudah diunduh</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <span>Ketuk <strong>Instal</strong> pada dialog yang muncul</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <span>Tunggu proses instalasi selesai</span>
                    </li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="step-4">
                <AccordionTrigger>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                      4
                    </div>
                    <span>Buka dan Gunakan Aplikasi</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pl-11 space-y-3">
                  <p className="text-muted-foreground">
                    Setelah instalasi selesai:
                  </p>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <span>Ketuk <strong>Buka</strong> atau cari ikon aplikasi di layar utama</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <span>Login menggunakan akun yang sudah terdaftar</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <span>Aplikasi siap digunakan!</span>
                    </li>
                  </ul>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        {/* FAQ */}
        <Card>
          <CardHeader>
            <CardTitle>Pertanyaan Umum</CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="faq-1">
                <AccordionTrigger>Apakah aplikasi ini aman?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  Ya, aplikasi ini dikembangkan secara resmi oleh pihak sekolah. File APK yang disediakan 
                  adalah file asli dan tidak mengandung malware atau virus.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="faq-2">
                <AccordionTrigger>Bagaimana cara update aplikasi?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  Ketika ada versi baru, aplikasi akan menampilkan notifikasi update. Anda dapat 
                  mengunduh versi terbaru dari halaman ini dan menginstalnya langsung tanpa perlu 
                  menghapus versi lama.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="faq-3">
                <AccordionTrigger>Aplikasi tidak bisa diinstal, apa yang harus dilakukan?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  Pastikan Anda sudah mengaktifkan izin "Sumber tidak dikenal" seperti pada panduan di atas. 
                  Jika masih bermasalah, coba restart perangkat dan ulangi proses instalasi.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="faq-4">
                <AccordionTrigger>Apakah data saya aman setelah update?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  Ya, semua data Anda tersimpan dengan aman di server. Setelah update, Anda hanya perlu 
                  login kembali dan semua data akan tetap tersedia.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
