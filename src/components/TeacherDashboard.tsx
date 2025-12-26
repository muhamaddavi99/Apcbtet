import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { usePushNotification } from '@/hooks/usePushNotification';
import { BookOpen, Clock, Users, QrCode, CheckCircle, XCircle, AlertCircle, Loader2, Play, ScanLine, Timer, Volume2 } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import TeacherAnnouncementsWidget from './TeacherAnnouncementsWidget';
import TeacherLeaveStatusWidget from './TeacherLeaveStatusWidget';

interface Schedule {
  id: string;
  day: string;
  start_time: string;
  end_time: string;
  class_id: string;
  subject_id: string;
  classes: { id: string; name: string; grade: string };
  subjects: { id: string; name: string; code: string };
}

interface Student {
  id: string;
  name: string;
  nis: string;
  qr_code: string | null;
}

interface StudentAttendance {
  student_id: string;
  status: string;
  notes: string;
}

interface TeachingSessionDB {
  id: string;
  teacher_id: string;
  schedule_id: string;
  class_id: string;
  subject_id: string;
  start_time: string;
  end_time: string;
  status: 'active' | 'completed' | 'cancelled';
}

export default function TeacherDashboard({ userId }: { userId: string }) {
  const [todaySchedules, setTodaySchedules] = useState<Schedule[]>([]);
  const [currentSchedule, setCurrentSchedule] = useState<Schedule | null>(null);
  const [nextSchedule, setNextSchedule] = useState<Schedule | null>(null);
  const [teachingDialogOpen, setTeachingDialogOpen] = useState(false);
  const [verificationDialogOpen, setVerificationDialogOpen] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Record<string, StudentAttendance>>({});
  const [scannerActive, setScannerActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [teacherAttendanceChecked, setTeacherAttendanceChecked] = useState(false);
  const [studentVerified, setStudentVerified] = useState(false);
  const [remainingTime, setRemainingTime] = useState<number>(0);
  const [isTeaching, setIsTeaching] = useState(false);
  const [pendingSchedule, setPendingSchedule] = useState<Schedule | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [fiveMinuteWarningShown, setFiveMinuteWarningShown] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [hasApprovedLeave, setHasApprovedLeave] = useState(false);
  const [attendanceSaved, setAttendanceSaved] = useState(false);
  
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const timerRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const scannerInitializing = useRef(false);
  const { toast } = useToast();
  const { sendNotification, permission } = usePushNotification();

  // Load active teaching session and check approved leave
  useEffect(() => {
    const loadActiveSession = async () => {
      const { data: session } = await supabase
        .from('teaching_sessions')
        .select('*')
        .eq('teacher_id', userId)
        .eq('status', 'active')
        .maybeSingle();

      if (session) {
        const endTime = new Date(session.end_time);
        const now = new Date();
        const remaining = Math.floor((endTime.getTime() - now.getTime()) / 1000);
        
        if (remaining > 0) {
          setIsTeaching(true);
          setRemainingTime(remaining);
          setActiveSessionId(session.id);
          // Load schedule data
          loadScheduleById(session.schedule_id);
        } else {
          // Session expired, mark as completed
          await supabase
            .from('teaching_sessions')
            .update({ status: 'completed' })
            .eq('id', session.id);
        }
      }
    };

    // Check if teacher has approved leave for today
    const checkApprovedLeave = async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data } = await supabase
        .from('teacher_leave_requests')
        .select('*')
        .eq('teacher_id', userId)
        .eq('status', 'approved')
        .lte('start_date', today)
        .gte('end_date', today)
        .maybeSingle();

      if (data) {
        setHasApprovedLeave(true);
      }
    };

    loadActiveSession();
    checkApprovedLeave();
  }, [userId]);

  // Subscribe to realtime updates for this teacher's sessions
  useEffect(() => {
    const channel = supabase
      .channel('teaching-sessions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'teaching_sessions',
          filter: `teacher_id=eq.${userId}`,
        },
        (payload) => {
          console.log('Teaching session update:', payload);
          if (payload.eventType === 'UPDATE' && payload.new.status === 'completed') {
            setIsTeaching(false);
            setRemainingTime(0);
            setActiveSessionId(null);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const loadScheduleById = async (scheduleId: string) => {
    const { data } = await supabase
      .from('schedules')
      .select(`
        *,
        classes (id, name, grade),
        subjects (id, name, code)
      `)
      .eq('id', scheduleId)
      .single();
    
    if (data) {
      setCurrentSchedule(data);
      // Load students for the class
      const { data: studentsData } = await supabase
        .from('students')
        .select('*')
        .eq('class_id', data.class_id)
        .order('name');
      
      if (studentsData) {
        setStudents(studentsData);
        const initialAttendance: Record<string, StudentAttendance> = {};
        studentsData.forEach(student => {
          initialAttendance[student.id] = {
            student_id: student.id,
            status: 'alpha',
            notes: '',
          };
        });
        setAttendance(initialAttendance);
      }
    }
  };

  const startTeachingSession = async (schedule: Schedule) => {
    const [endHour, endMinute] = schedule.end_time.split(':').map(Number);
    const endTime = new Date();
    endTime.setHours(endHour, endMinute, 0, 0);
    
    const { data, error } = await supabase
      .from('teaching_sessions')
      .insert({
        teacher_id: userId,
        schedule_id: schedule.id,
        class_id: schedule.class_id,
        subject_id: schedule.subject_id,
        end_time: endTime.toISOString(),
        status: 'active',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating teaching session:', error);
      return null;
    }

    return data;
  };

  const endTeachingSession = async () => {
    if (activeSessionId) {
      await supabase
        .from('teaching_sessions')
        .update({ status: 'completed' })
        .eq('id', activeSessionId);
      setActiveSessionId(null);
    }
  };

  // Play warning sound at 5 minutes remaining
  const playWarningSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 600;
      oscillator.type = 'sine';
      gainNode.gain.value = 0.4;
      
      oscillator.start();
      
      // Play 2 short beeps
      setTimeout(() => {
        oscillator.frequency.value = 800;
      }, 150);
      setTimeout(() => {
        oscillator.stop();
        audioContext.close();
      }, 300);

      // Speech notification
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance('Waktu mengajar tinggal 5 menit lagi');
        utterance.lang = 'id-ID';
        utterance.rate = 1;
        window.speechSynthesis.speak(utterance);
      }

      // Push notification
      if (permission === 'granted') {
        sendNotification({
          title: '⏰ 5 Menit Lagi!',
          body: 'Waktu mengajar tinggal 5 menit lagi.',
          tag: 'teaching-warning',
        });
      }
    } catch (error) {
      console.error('Error playing warning sound:', error);
    }
  };

  // Update current time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Recalculate current/next schedule when time changes
  useEffect(() => {
    if (todaySchedules.length > 0) {
      updateCurrentAndNextSchedule(todaySchedules);
    }
  }, [currentTime, todaySchedules]);

  useEffect(() => {
    loadTodaySchedules();
  }, [userId]);

  useEffect(() => {
    return () => {
      stopScanner();
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
      }
    };
  }, []);

  // Timer countdown effect
  useEffect(() => {
    if (isTeaching && currentSchedule && remainingTime > 0) {
      timerRef.current = window.setInterval(() => {
        setRemainingTime(prev => {
          // Check for 5 minute warning (300 seconds)
          if (prev === 300 && !fiveMinuteWarningShown) {
            playWarningSound();
            setFiveMinuteWarningShown(true);
            toast({
              title: '⚠️ 5 Menit Lagi!',
              description: 'Waktu mengajar tinggal 5 menit lagi.',
            });
          }
          
          if (prev <= 1) {
            // Time's up - play sound
            playEndSound();
            setIsTeaching(false);
            endTeachingSession();
            setFiveMinuteWarningShown(false);
            if (timerRef.current) {
              window.clearInterval(timerRef.current);
            }
            toast({
              title: 'Waktu Habis!',
              description: 'Waktu mengajar telah selesai.',
            });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
      }
    };
  }, [isTeaching, currentSchedule, fiveMinuteWarningShown]);

  const playEndSound = () => {
    try {
      // Create audio context for notification sound
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.value = 0.5;
      
      oscillator.start();
      
      // Play 3 beeps
      setTimeout(() => {
        oscillator.frequency.value = 1000;
      }, 200);
      setTimeout(() => {
        oscillator.frequency.value = 1200;
      }, 400);
      setTimeout(() => {
        oscillator.stop();
        audioContext.close();
      }, 600);

      // Also try speech synthesis
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance('Waktu mengajar telah habis');
        utterance.lang = 'id-ID';
        utterance.rate = 1;
        window.speechSynthesis.speak(utterance);
      }
    } catch (error) {
      console.error('Error playing sound:', error);
    }
  };

  const getDayName = () => {
    const days = ['Ahad', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    return days[new Date().getDay()];
  };

  const updateCurrentAndNextSchedule = (schedules: Schedule[]) => {
    const now = currentTime;
    const currentTimeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    let current: Schedule | null = null;
    let next: Schedule | null = null;

    for (const schedule of schedules) {
      // Only consider schedule as "current" if we're within its time range
      if (schedule.start_time <= currentTimeStr && schedule.end_time >= currentTimeStr) {
        current = schedule;
      } else if (schedule.start_time > currentTimeStr && !next) {
        next = schedule;
      }
    }

    setCurrentSchedule(current);
    setNextSchedule(next);
  };

  const loadTodaySchedules = async () => {
    try {
      setLoading(true);
      const today = getDayName();
      
      const { data, error } = await supabase
        .from('schedules')
        .select(`
          *,
          classes (id, name, grade),
          subjects (id, name, code)
        `)
        .eq('teacher_id', userId)
        .eq('day', today)
        .order('start_time');

      if (error) throw error;

      const schedules = data || [];
      setTodaySchedules(schedules);
      updateCurrentAndNextSchedule(schedules);
    } catch (error: any) {
      console.error('Error loading schedules:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkTeacherAttendance = async () => {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('attendance')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .maybeSingle();

    return !!data;
  };

  const isScheduleTimeReached = (schedule: Schedule) => {
    const now = currentTime;
    const currentTimeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    return currentTimeStr >= schedule.start_time;
  };

  // Check if schedule time has passed (end_time)
  const isScheduleTimePassed = (schedule: Schedule) => {
    const now = currentTime;
    const currentTimeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    return currentTimeStr > schedule.end_time;
  };

  const calculateRemainingSeconds = (schedule: Schedule) => {
    const now = new Date();
    const [endHour, endMinute] = schedule.end_time.split(':').map(Number);
    const endTime = new Date(now);
    endTime.setHours(endHour, endMinute, 0, 0);
    
    const diffMs = endTime.getTime() - now.getTime();
    return Math.max(0, Math.floor(diffMs / 1000));
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartTeaching = async (schedule: Schedule) => {
    // Check if teacher has approved leave
    if (hasApprovedLeave) {
      toast({
        title: 'Tidak Dapat Mengajar',
        description: 'Anda sedang izin/sakit dan tidak dapat memulai sesi mengajar.',
        variant: 'destructive',
      });
      return;
    }

    // Check if time has reached
    if (!isScheduleTimeReached(schedule)) {
      const [startHour, startMinute] = schedule.start_time.split(':').map(Number);
      toast({
        title: 'Belum Waktunya',
        description: `Jadwal mengajar dimulai pukul ${schedule.start_time}. Silakan tunggu sampai waktu tersebut.`,
        variant: 'destructive',
      });
      return;
    }

    // Check if teacher has checked in
    const hasCheckedIn = await checkTeacherAttendance();
    if (!hasCheckedIn) {
      toast({
        title: 'Belum Absensi',
        description: 'Anda harus melakukan absensi terlebih dahulu sebelum mengajar.',
        variant: 'destructive',
      });
      return;
    }

    setTeacherAttendanceChecked(true);
    setPendingSchedule(schedule);
    setStudentVerified(false);
    setAttendanceSaved(false);
    
    // Load students for the class
    const { data: studentsData, error } = await supabase
      .from('students')
      .select('*')
      .eq('class_id', schedule.class_id)
      .order('name');

    if (error) {
      toast({
        title: 'Error',
        description: 'Gagal memuat data siswa',
        variant: 'destructive',
      });
      return;
    }

    setStudents(studentsData || []);
    
    // Load existing attendance for today
    const today = new Date().toISOString().split('T')[0];
    const { data: existingAttendance } = await supabase
      .from('student_attendance')
      .select('*')
      .eq('class_id', schedule.class_id)
      .eq('date', today);
    
    // Initialize attendance with existing data or default status
    const initialAttendance: Record<string, StudentAttendance> = {};
    (studentsData || []).forEach(student => {
      const existing = existingAttendance?.find(a => a.student_id === student.id);
      initialAttendance[student.id] = {
        student_id: student.id,
        status: existing?.status || 'alpha',
        notes: existing?.notes || '',
      };
    });
    setAttendance(initialAttendance);
    
    // Check if attendance already exists
    if (existingAttendance && existingAttendance.length > 0) {
      setAttendanceSaved(true);
    }
    
    // Calculate remaining time and start teaching directly (no QR verification needed)
    const remaining = calculateRemainingSeconds(schedule);
    setRemainingTime(remaining);
    setCurrentSchedule(schedule);
    setIsTeaching(true);
    setFiveMinuteWarningShown(false);
    
    // Create session in Supabase
    const session = await startTeachingSession(schedule);
    if (session) {
      setActiveSessionId(session.id);
    }
    
    // Open teaching dialog directly
    setTeachingDialogOpen(true);
    
    toast({
      title: 'Sesi Mengajar Dimulai',
      description: `Silakan lakukan absensi siswa kelas ${schedule.classes.name}`,
    });
  };

  const openVerification = async () => {
    if (!attendanceSaved) {
      toast({
        title: 'Absensi belum disimpan',
        description: 'Silakan simpan absensi terlebih dahulu sebelum verifikasi QR.',
        variant: 'destructive',
      });
      return;
    }

    setVerificationDialogOpen(true);

    // Start scanner after dialog renders
    window.setTimeout(() => {
      startScanner();
    }, 250);
  };

  const startScanner = async () => {
    // Prevent multiple initializations
    if (scannerInitializing.current || scannerActive) {
      return;
    }
    
    scannerInitializing.current = true;
    
    try {
      // Request camera permission first
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      stream.getTracks().forEach(track => track.stop());

      setScannerActive(true);
      
      // Wait for DOM to update
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const elementId = verificationDialogOpen ? 'qr-reader-verify' : 'qr-reader-teacher';
      const element = document.getElementById(elementId);
      
      if (!element) {
        console.error('Scanner element not found:', elementId);
        setScannerActive(false);
        scannerInitializing.current = false;
        toast({
          title: 'Error',
          description: 'Tidak dapat menemukan elemen scanner. Coba tutup dan buka kembali.',
          variant: 'destructive',
        });
        return;
      }

      // Stop existing scanner if any
      if (scannerRef.current) {
        try {
          await scannerRef.current.stop();
          scannerRef.current.clear();
        } catch (e) {
          console.log('Existing scanner cleanup:', e);
        }
        scannerRef.current = null;
      }
      
      scannerRef.current = new Html5Qrcode(elementId);

      await scannerRef.current.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          if (verificationDialogOpen) {
            handleVerificationScan(decodedText);
          } else {
            handleQRScan(decodedText);
          }
        },
        () => {}
      );
      
      scannerInitializing.current = false;
    } catch (error: any) {
      console.error('Camera/Scanner error:', error);
      scannerInitializing.current = false;
      setScannerActive(false);
      
      let errorMessage = 'Gagal mengakses kamera.';
      if (error.name === 'NotAllowedError' || error.message?.includes('Permission')) {
        errorMessage = 'Izin kamera ditolak. Silakan izinkan akses kamera di pengaturan browser.';
      } else if (error.name === 'NotFoundError' || error.message?.includes('Requested device not found')) {
        errorMessage = 'Kamera tidak ditemukan. Pastikan perangkat memiliki kamera.';
      } else if (error.name === 'NotReadableError' || error.message?.includes('Could not start')) {
        errorMessage = 'Kamera sedang digunakan aplikasi lain. Tutup aplikasi lain yang menggunakan kamera.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: 'Error Kamera',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        if (state === 2) { // Html5QrcodeScannerState.SCANNING
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
        scannerRef.current = null;
      } catch (error) {
        console.log('Error stopping scanner:', error);
        scannerRef.current = null;
      }
    }
    setScannerActive(false);
    scannerInitializing.current = false;
  };

  const handleVerificationScan = async (qrCode: string) => {
    // Find student by QR code
    const student = students.find(s => s.qr_code === qrCode || s.nis === qrCode || s.id === qrCode);

    if (!student) {
      toast({
        title: 'Tidak Ditemukan',
        description: 'Siswa tidak ditemukan di kelas ini. Scan QR siswa yang terdaftar.',
        variant: 'destructive',
      });
      return;
    }

    await stopScanner();
    setStudentVerified(true);
    setVerificationDialogOpen(false);

    toast({
      title: 'Verifikasi Berhasil',
      description: `Verifikasi berhasil dengan QR siswa: ${student.name}`,
    });
  };

  const handleQRScan = (qrCode: string) => {
    // Find student by QR code
    const student = students.find(s => s.qr_code === qrCode || s.nis === qrCode || s.id === qrCode);
    
    if (student) {
      setAttendance(prev => ({
        ...prev,
        [student.id]: {
          ...prev[student.id],
          status: 'hadir',
        }
      }));
      
      toast({
        title: 'Berhasil',
        description: `${student.name} tercatat hadir`,
      });
    } else {
      toast({
        title: 'Tidak ditemukan',
        description: 'Siswa tidak ditemukan di kelas ini',
        variant: 'destructive',
      });
    }
  };

  const handleStatusChange = (studentId: string, status: string) => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status,
      }
    }));
  };

  const handleSaveAttendance = async () => {
    if (!currentSchedule) return;

    setSaving(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Prepare attendance records
      const attendanceRecords = Object.entries(attendance).map(([studentId, att]) => ({
        student_id: studentId,
        class_id: currentSchedule.class_id,
        date: today,
        status: att.status,
        notes: att.notes || null,
        created_by: userId,
      }));

      // Delete existing attendance for today
      await supabase
        .from('student_attendance')
        .delete()
        .eq('class_id', currentSchedule.class_id)
        .eq('date', today);

      // Insert new attendance
      const { error } = await supabase
        .from('student_attendance')
        .insert(attendanceRecords);

      if (error) throw error;

      setAttendanceSaved(true);
      
      toast({
        title: 'Berhasil',
        description: 'Absensi siswa berhasil disimpan. Timer mengajar tetap berjalan.',
      });

      // Stop scanner but keep the dialog open and timer running
      await stopScanner();
      
      // Just close the dialog, don't stop teaching session
      setTeachingDialogOpen(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Gagal menyimpan absensi',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'hadir':
        return <Badge className="bg-green-500 hover:bg-green-600"><CheckCircle className="h-3 w-3 mr-1" />Hadir</Badge>;
      case 'izin':
        return <Badge className="bg-yellow-500 hover:bg-yellow-600"><AlertCircle className="h-3 w-3 mr-1" />Izin</Badge>;
      case 'sakit':
        return <Badge className="bg-blue-500 hover:bg-blue-600"><AlertCircle className="h-3 w-3 mr-1" />Sakit</Badge>;
      default:
        return <Badge className="bg-red-500 hover:bg-red-600"><XCircle className="h-3 w-3 mr-1" />Alpha</Badge>;
    }
  };

  const getAttendanceSummary = () => {
    const summary = { hadir: 0, izin: 0, sakit: 0, alpha: 0 };
    Object.values(attendance).forEach(att => {
      summary[att.status as keyof typeof summary]++;
    });
    return summary;
  };

  const getTimeUntilStart = (schedule: Schedule) => {
    const now = currentTime;
    const [startHour, startMinute] = schedule.start_time.split(':').map(Number);
    const startTime = new Date(now);
    startTime.setHours(startHour, startMinute, 0, 0);
    
    const diffMs = startTime.getTime() - now.getTime();
    if (diffMs <= 0) return null;
    
    const minutes = Math.floor(diffMs / 60000);
    const seconds = Math.floor((diffMs % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  if (loading) {
    return (
      <Card className="animate-fade-up">
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="animate-fade-up border-l-4 border-l-primary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            {hasApprovedLeave 
              ? 'Anda sedang izin/sakit hari ini'
              : todaySchedules.length > 0 
                ? 'Halo, Anda akan mengajar hari ini!' 
                : 'Halo, Anda tidak mengajar hari ini'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Show approved leave notice */}
          {hasApprovedLeave && (
            <div className="p-4 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg border border-yellow-300 dark:border-yellow-700 mb-4">
              <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
                <AlertCircle className="h-5 w-5" />
                <p className="font-medium">Pengajuan izin/sakit Anda telah disetujui untuk hari ini.</p>
              </div>
              <p className="text-sm text-yellow-600 dark:text-yellow-500 mt-1">
                Anda tidak dapat memulai sesi mengajar selama masa izin.
              </p>
            </div>
          )}
          
          {todaySchedules.length > 0 ? (
            <div className="space-y-4">
              {/* Current Schedule */}
              {currentSchedule && (
                <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Sedang Berlangsung</p>
                      <p className="font-semibold text-lg">{currentSchedule.subjects.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Kelas {currentSchedule.classes.name} • {currentSchedule.start_time} - {currentSchedule.end_time}
                      </p>
                    </div>
                    {isTeaching && remainingTime > 0 ? (
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg animate-pulse">
                          <Timer className="h-5 w-5" />
                          <span className="text-xl font-bold tabular-nums">{formatTime(remainingTime)}</span>
                        </div>
                        <Button 
                          variant="outline"
                          size="sm"
                          onClick={() => setTeachingDialogOpen(true)}
                          className="gap-1"
                        >
                          <Users className="h-4 w-4" />
                          Lihat Absensi
                        </Button>
                      </div>
                    ) : !isScheduleTimePassed(currentSchedule) && !hasApprovedLeave ? (
                      <Button 
                        onClick={() => handleStartTeaching(currentSchedule)} 
                        className="gap-2"
                        disabled={isTeaching}
                      >
                        <Play className="h-4 w-4" />
                        Ayo Mengajar
                      </Button>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">
                        Waktu Berakhir
                      </Badge>
                    )}
                  </div>
                  {/* Progress bar saat mengajar */}
                  {isTeaching && remainingTime > 0 && currentSchedule && (
                    <div className="mt-3">
                      <Progress 
                        value={(remainingTime / calculateRemainingSeconds(currentSchedule)) * 100} 
                        className="h-2"
                      />
                      <p className="text-xs text-muted-foreground mt-1 text-right">
                        Sisa waktu mengajar
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* All Today's Schedule */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Jadwal Hari Ini ({getDayName()})</p>
                {todaySchedules.map((schedule) => {
                  const isCurrent = currentSchedule?.id === schedule.id;
                  const isNext = nextSchedule?.id === schedule.id;
                  const timeReached = isScheduleTimeReached(schedule);
                  const timePassed = isScheduleTimePassed(schedule);
                  const timeUntilStart = getTimeUntilStart(schedule);
                  
                  return (
                    <div 
                      key={schedule.id}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        isCurrent ? 'bg-primary/5 border-primary' : 
                        isNext ? 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-700' : 
                        timePassed ? 'bg-muted/50 opacity-60' :
                        'bg-muted/30'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${isCurrent ? 'bg-primary/20' : timePassed ? 'bg-muted' : 'bg-muted'}`}>
                          <Clock className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{schedule.subjects.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Kelas {schedule.classes.name} • {schedule.start_time} - {schedule.end_time}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isCurrent && <Badge className="bg-green-500">Berlangsung</Badge>}
                        {timePassed && !isCurrent && (
                          <Badge variant="outline" className="text-muted-foreground">
                            Selesai
                          </Badge>
                        )}
                        {isNext && (
                          <div className="flex items-center gap-2">
                            {timeUntilStart && (
                              <Badge variant="outline" className="border-orange-500 text-orange-600">
                                <Timer className="h-3 w-3 mr-1" />
                                {timeUntilStart}
                              </Badge>
                            )}
                            <Badge variant="outline" className="border-yellow-500 text-yellow-600">Selanjutnya</Badge>
                          </div>
                        )}
                        {!isCurrent && !timePassed && timeReached && !hasApprovedLeave && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleStartTeaching(schedule)}
                            disabled={isTeaching}
                          >
                            <Play className="h-4 w-4 mr-1" />
                            Mulai
                          </Button>
                        )}
                        {!isCurrent && !timeReached && !isNext && timeUntilStart && (
                          <Badge variant="outline" className="text-muted-foreground">
                            <Timer className="h-3 w-3 mr-1" />
                            {timeUntilStart}
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <BookOpen className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Tidak ada jadwal mengajar hari ini.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Announcements and Leave Status Widgets */}
      <div className="grid md:grid-cols-2 gap-4 mt-4">
        <TeacherAnnouncementsWidget />
        <TeacherLeaveStatusWidget userId={userId} />
      </div>

      {/* Teaching Dialog with QR Scanner */}
      <Dialog open={teachingDialogOpen} onOpenChange={(open) => {
        if (!open) {
          stopScanner();
        }
        setTeachingDialogOpen(open);
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Absensi Kelas {currentSchedule?.classes.name} - {currentSchedule?.subjects.name}
              </span>
            </DialogTitle>
          </DialogHeader>

          {/* Timer Display */}
          {isTeaching && remainingTime > 0 && (
            <Card className="border-2 border-primary bg-primary/5">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Timer className="h-5 w-5 text-primary" />
                    <span className="text-sm font-medium">Sisa Waktu Mengajar</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold text-primary tabular-nums">
                      {formatTime(remainingTime)}
                    </span>
                    <Volume2 className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
                <Progress 
                  value={(remainingTime / calculateRemainingSeconds(currentSchedule!)) * 100} 
                  className="mt-2"
                />
              </CardContent>
            </Card>
          )}

          <div className="space-y-4">
            {/* Verification Section */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <ScanLine className="h-4 w-4" />
                  Verifikasi Mengajar
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {studentVerified ? (
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm">
                    <CheckCircle className="h-4 w-4" />
                    <span>Sudah terverifikasi</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Verifikasi dilakukan dengan scan 1 QR siswa. (Wajib simpan absensi dulu.)
                    </p>
                    <Button onClick={openVerification} variant="outline" className="w-full gap-2">
                      <QrCode className="h-4 w-4" />
                      Verifikasi QR
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* QR Scanner Section */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <ScanLine className="h-4 w-4" />
                  Scan QR Siswa
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!scannerActive ? (
                  <Button onClick={startScanner} className="w-full gap-2">
                    <QrCode className="h-4 w-4" />
                    Aktifkan Scanner QR
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <div id="qr-reader-teacher" className="w-full rounded-lg overflow-hidden"></div>
                    <Button onClick={stopScanner} variant="outline" className="w-full">
                      Matikan Scanner
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Attendance Summary */}
            {students.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                <Badge variant="outline" className="gap-1">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  Hadir: {getAttendanceSummary().hadir}
                </Badge>
                <Badge variant="outline" className="gap-1">
                  <AlertCircle className="h-3 w-3 text-yellow-500" />
                  Izin: {getAttendanceSummary().izin}
                </Badge>
                <Badge variant="outline" className="gap-1">
                  <AlertCircle className="h-3 w-3 text-blue-500" />
                  Sakit: {getAttendanceSummary().sakit}
                </Badge>
                <Badge variant="outline" className="gap-1">
                  <XCircle className="h-3 w-3 text-red-500" />
                  Alpha: {getAttendanceSummary().alpha}
                </Badge>
              </div>
            )}

            {/* Student List */}
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {students.map((student) => (
                <div key={student.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{student.name}</p>
                    <p className="text-sm text-muted-foreground">NIS: {student.nis}</p>
                  </div>
                  <Select
                    value={attendance[student.id]?.status || 'alpha'}
                    onValueChange={(value) => handleStatusChange(student.id, value)}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hadir">
                        <span className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3 text-green-500" /> Hadir
                        </span>
                      </SelectItem>
                      <SelectItem value="izin">
                        <span className="flex items-center gap-1">
                          <AlertCircle className="h-3 w-3 text-yellow-500" /> Izin
                        </span>
                      </SelectItem>
                      <SelectItem value="sakit">
                        <span className="flex items-center gap-1">
                          <AlertCircle className="h-3 w-3 text-blue-500" /> Sakit
                        </span>
                      </SelectItem>
                      <SelectItem value="alpha">
                        <span className="flex items-center gap-1">
                          <XCircle className="h-3 w-3 text-red-500" /> Alpha
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            {/* Save Button */}
            <div className="space-y-2">
              {attendanceSaved && (
                <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400 text-sm">
                  <CheckCircle className="h-4 w-4" />
                  <span>Absensi sudah tersimpan</span>
                </div>
              )}
              <Button 
                onClick={handleSaveAttendance} 
                disabled={saving} 
                className="w-full"
              >
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {attendanceSaved ? 'Simpan Ulang Absensi' : 'Simpan Absensi'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
