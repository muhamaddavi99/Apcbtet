import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Html5Qrcode } from 'html5-qrcode';
import { Clock, CheckCircle, User, Phone, Mail, GraduationCap, BookOpen } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSchoolSettings } from '@/contexts/SchoolContext';
import { usePageTitle } from '@/hooks/usePageTitle';
import { formatWibClock, formatWibLongDate, getWibDate, getWibTimeHM } from '@/lib/wib';

interface ScannedPerson {
  id: string;
  name: string;
  role: string;
  avatar_url: string | null;
  email?: string;
  phone?: string;
  nip?: string;
  nis?: string;
  class_name?: string;
}

export default function AbsensiOtomatis() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [scannedPerson, setScannedPerson] = useState<ScannedPerson | null>(null);
  const [scanning, setScanning] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);
  const { toast } = useToast();
  const { settings } = useSchoolSettings();
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const successTimeoutRef = useRef<number | null>(null);
  const isProcessingRef = useRef(false);
  const scannerDivId = 'auto-qr-scanner';

  usePageTitle('Absensi Otomatis');

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    startScanner();

    return () => {
      clearInterval(timer);
      if (successTimeoutRef.current) {
        window.clearTimeout(successTimeoutRef.current);
      }
      stopScanner();
    };
  }, []);

  // Play QR scan success sound
  const playSuccessSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.type = 'sine';
      gainNode.gain.value = 0.5;
      
      // Rising tone for success effect
      oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
      oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1); // E5
      oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.2); // G5
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
      
      // Cleanup
      oscillator.onended = () => {
        audioContext.close();
      };
    } catch (error) {
      console.error('Error playing success sound:', error);
    }
  };

  const startScanner = async () => {
    try {
      // Check if camera permission is available
      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasCamera = devices.some(device => device.kind === 'videoinput');
      
      if (!hasCamera) {
        toast({
          title: 'Error',
          description: 'Tidak ada kamera yang tersedia',
          variant: 'destructive',
        });
        setScanning(false);
        return;
      }

      setScanning(true);
      const scanner = new Html5Qrcode(scannerDivId);
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 300, height: 300 },
        },
        async (decodedText) => {
          if (isProcessingRef.current) return;
          isProcessingRef.current = true;

          try {
            // Use WIB time for validation and storage
            const currentTimeWib = getWibTimeHM();
            const todayWib = getWibDate();
            
            // Check if within school hours using WIB time
            if (currentTimeWib < settings.check_in_time || currentTimeWib > settings.check_out_time) {
              isProcessingRef.current = false;
              toast({
                title: 'Diluar Jam Sekolah',
                description: `Absensi hanya dapat dilakukan antara ${settings.check_in_time} - ${settings.check_out_time}`,
                variant: 'destructive',
              });
              return;
            }

            // Try parsing as JSON first (for teacher QR codes)
            let userId: string;
            try {
              const qrData = JSON.parse(decodedText);
              userId = qrData.userId || decodedText;
            } catch {
              userId = decodedText;
            }

            // Check if user/student exists
            const { data: profile } = await supabase
              .from('profiles')
              .select('id, full_name, role, avatar_url, email, phone, nip')
              .eq('id', userId)
              .single();

            const { data: student } = await supabase
              .from('students')
              .select('id, name, avatar_url, phone, nis, class_id, classes(name)')
              .eq('id', userId)
              .single();
            
            // Determine status - teachers always "hadir" (no late status)
            let attendanceStatus = 'hadir';

            if (profile) {
              // Teachers always "hadir" (no late status), staff/admin check late threshold
              if (profile.role !== 'teacher' && currentTimeWib > settings.late_time) {
                attendanceStatus = 'terlambat';
              }

              // Record attendance for teacher/staff with WIB date/time
              const { data: existingAttendance } = await supabase
                .from('attendance')
                .select('id, check_in')
                .eq('user_id', profile.id)
                .eq('date', todayWib)
                .maybeSingle();

              if (existingAttendance && existingAttendance.check_in) {
                // Update check_out with WIB time
                await supabase
                  .from('attendance')
                  .update({ check_out: currentTimeWib })
                  .eq('id', existingAttendance.id);
              } else {
                // Create check_in with proper status using WIB time
                await supabase
                  .from('attendance')
                  .upsert({
                    user_id: profile.id,
                    date: todayWib,
                    check_in: currentTimeWib,
                    status: attendanceStatus,
                    type: 'auto',
                  });
              }

              setScannedPerson({
                id: profile.id,
                name: profile.full_name,
                role: profile.role === 'teacher' ? 'Guru' : profile.role === 'admin' ? 'Administrator' : 'Staf',
                avatar_url: profile.avatar_url,
                email: profile.email,
                phone: profile.phone || undefined,
                nip: profile.nip,
              });

              playSuccessSound();
              setShowSuccess(true);
              toast({
                title: 'Absensi Berhasil! ✅',
                description: `${profile.full_name} telah diabsen`,
              });
            } else if (student) {
              // Students check late threshold
              if (currentTimeWib > settings.late_time) {
                attendanceStatus = 'terlambat';
              }

              // Record attendance for student with WIB date
              const studentData = student as any;
              if (studentData?.class_id) {
                const { data: existingAttendance } = await supabase
                  .from('student_attendance')
                  .select('id')
                  .eq('student_id', student.id)
                  .eq('date', todayWib)
                  .maybeSingle();

                if (!existingAttendance) {
                  await supabase
                    .from('student_attendance')
                    .insert({
                      student_id: student.id,
                      class_id: studentData.class_id,
                      date: todayWib,
                      status: attendanceStatus,
                    });
                }

                const statusLabel = attendanceStatus === 'terlambat' ? ' (Terlambat)' : '';
                setScannedPerson({
                  id: student.id,
                  name: student.name,
                  role: 'Siswa',
                  avatar_url: student.avatar_url,
                  phone: student.phone || undefined,
                  nis: student.nis,
                  class_name: studentData.classes?.name,
                });

                playSuccessSound();
                setShowSuccess(true);
                toast({
                  title: `Absensi Berhasil!${statusLabel} ✅`,
                  description: `${student.name} telah diabsen`,
                });
              }
            } else {
              throw new Error('QR Code tidak valid');
            }

            // Stop scanning so the UI stays on the success screen (hands-free)
            try {
              if (scannerRef.current) {
                await scannerRef.current.stop();
                scannerRef.current.clear();
                scannerRef.current = null;
              }
            } catch {
              // ignore
            }

            // Clear previous timer if any
            if (successTimeoutRef.current) {
              window.clearTimeout(successTimeoutRef.current);
            }

            // Auto return to scan mode after 3 seconds
            successTimeoutRef.current = window.setTimeout(() => {
              setScannedPerson(null);
              setShowSuccess(false);
              isProcessingRef.current = false;
              startScanner();
            }, 3000);
          } catch (error: any) {
            console.error('Scan error:', error);
            isProcessingRef.current = false;
            toast({
              title: 'Error',
              description: error.message || 'Gagal melakukan absensi',
              variant: 'destructive',
            });
          }
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
    if (successTimeoutRef.current) {
      window.clearTimeout(successTimeoutRef.current);
      successTimeoutRef.current = null;
    }

    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
        scannerRef.current = null;
      } catch (error) {
        console.error('Error stopping scanner:', error);
      }
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10 flex flex-col items-center justify-center p-6">
      {/* Header with School Info */}
      <div className="text-center mb-6">
        {settings.school_icon_url ? (
          <img 
            src={settings.school_icon_url} 
            alt="School Logo" 
            className="h-16 w-16 mx-auto mb-3 rounded-lg object-cover"
          />
        ) : (
          <div className="h-16 w-16 mx-auto mb-3 bg-primary rounded-lg flex items-center justify-center">
            <GraduationCap className="h-10 w-10 text-primary-foreground" />
          </div>
        )}
        <h1 className="text-2xl font-bold text-primary">{settings.school_name}</h1>
        <p className="text-sm text-muted-foreground">Sistem Absensi Otomatis</p>
      </div>

      {/* Clock Display - Using WIB */}
      <Card className="w-full max-w-2xl mb-6 p-6 text-center bg-card/80 backdrop-blur">
        <div className="flex items-center justify-center mb-2">
          <Clock className="h-8 w-8 text-primary mr-3" />
          <h2 className="text-5xl font-bold text-foreground tabular-nums">{formatWibClock(currentTime)}</h2>
        </div>
        <p className="text-lg text-muted-foreground">{formatWibLongDate(currentTime)}</p>
      </Card>

      {/* Scanner or Success Display */}
      <Card className="w-full max-w-2xl p-6 bg-card/80 backdrop-blur">
        {showSuccess && scannedPerson ? (
          <div className="animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
            {/* Success Animation */}
            <div className="text-center mb-6">
              <div className="relative inline-block">
                <div className="absolute inset-0 bg-green-500/20 rounded-full animate-ping" />
                <CheckCircle className="h-20 w-20 text-green-500 mx-auto relative" />
              </div>
              <h3 className="text-2xl font-bold text-green-600 mt-4">Absensi Berhasil!</h3>
              <div className="mt-2 inline-block px-4 py-2 bg-green-500 text-white rounded-full text-lg font-bold animate-pulse">
                HADIR ✓
              </div>
            </div>

            {/* Person Info Card */}
            <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl p-6">
              <div className="flex items-center gap-6">
                <Avatar className="h-24 w-24 border-4 border-primary/20">
                  <AvatarImage src={scannedPerson.avatar_url || ''} alt={scannedPerson.name} />
                  <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                    {getInitials(scannedPerson.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h4 className="text-2xl font-bold text-foreground">{scannedPerson.name}</h4>
                  <div className="inline-block px-3 py-1 bg-primary/20 text-primary rounded-full text-sm font-medium mt-1">
                    {scannedPerson.role}
                  </div>
                  
                  <div className="mt-4 space-y-2 text-sm">
                    {scannedPerson.nip && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <User className="h-4 w-4" />
                        <span>NIP: {scannedPerson.nip}</span>
                      </div>
                    )}
                    {scannedPerson.nis && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <BookOpen className="h-4 w-4" />
                        <span>NIS: {scannedPerson.nis}</span>
                      </div>
                    )}
                    {scannedPerson.class_name && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <GraduationCap className="h-4 w-4" />
                        <span>Kelas: {scannedPerson.class_name}</span>
                      </div>
                    )}
                    {scannedPerson.email && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="h-4 w-4" />
                        <span>{scannedPerson.email}</span>
                      </div>
                    )}
                    {scannedPerson.phone && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="h-4 w-4" />
                        <span>{scannedPerson.phone}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-6 text-center">
              <p className="text-xs text-muted-foreground">
                Otomatis kembali ke mode scan dalam 3 detik
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-foreground mb-2">Scan QR Code</h2>
              <p className="text-muted-foreground">Arahkan QR code ke kamera untuk absensi</p>
            </div>

            <div id={scannerDivId} className="rounded-lg overflow-hidden" />

            {!scanning && (
              <div className="text-center text-destructive mt-4">
                <p>Gagal mengakses kamera. Pastikan browser memiliki izin akses kamera.</p>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
