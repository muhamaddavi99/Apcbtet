import { useState, useEffect, useRef } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Camera, Save, Loader2, User, BookOpen, CheckCircle, XCircle, Clock, AlertTriangle, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { usePageTitle } from '@/hooks/usePageTitle';
import { getWibDate } from '@/lib/wib';

interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
  avatar_url: string | null;
  phone: string | null;
  nip: string | null;
}

interface TeachingStats {
  total_mengajar: number;
  hadir: number;
  izin: number;
  sakit: number;
  alpha: number;
}

export default function Profile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [teachingStats, setTeachingStats] = useState<TeachingStats>({
    total_mengajar: 0,
    hadir: 0,
    izin: 0,
    sakit: 0,
    alpha: 0,
  });

  usePageTitle('Profil Saya');
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      
      setProfile(data);
      setFormData({
        full_name: data.full_name || '',
        phone: data.phone || '',
      });

      // Load teaching stats if teacher
      if (data.role === 'teacher') {
        await loadTeachingStats(user.id);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Gagal memuat profil',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadTeachingStats = async (userId: string) => {
    try {
      // Get holidays for workday calculation
      const { data: holidays } = await supabase.from('holidays').select('date');
      const holidaySet = new Set((holidays || []).map(h => h.date));

      // Helper: check if a date is a workday (not Friday, not holiday)
      const isWorkday = (dateStr: string) => {
        if (!dateStr) return false;
        if (holidaySet.has(dateStr)) return false;
        // Get day of week from date string (YYYY-MM-DD)
        const d = new Date(`${dateStr}T00:00:00+07:00`);
        const dayOfWeek = d.getDay();
        // Friday = 5, skip; Sunday = 0, skip for schools that have Sunday off
        return dayOfWeek !== 5; // Only skip Friday for this school
      };

      // Get approved leave requests for this teacher (to add to izin/sakit count)
      const { data: leaveRequests } = await supabase
        .from('teacher_leave_requests')
        .select('start_date, end_date, request_type')
        .eq('teacher_id', userId)
        .eq('status', 'approved');

      // Calculate leave days from approved requests (excluding Friday and holidays)
      let leaveIzinDays = 0;
      let leaveSakitDays = 0;
      
      for (const leave of leaveRequests || []) {
        const start = new Date(`${leave.start_date}T00:00:00+07:00`);
        const end = new Date(`${leave.end_date}T00:00:00+07:00`);
        
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const dateStr = d.toISOString().split('T')[0];
          if (isWorkday(dateStr)) {
            if (leave.request_type === 'izin') {
              leaveIzinDays++;
            } else if (leave.request_type === 'sakit') {
              leaveSakitDays++;
            }
          }
        }
      }

      // Total mengajar: count unique workdays where teacher had a teaching session
      const { data: sessions } = await supabase
        .from('teaching_sessions')
        .select('start_time, status')
        .eq('teacher_id', userId)
        .in('status', ['active', 'completed']);

      const taughtWorkdays = new Set<string>();
      for (const s of sessions || []) {
        const dateStr = getWibDate(new Date(s.start_time));
        if (isWorkday(dateStr)) {
          taughtWorkdays.add(dateStr);
        }
      }

      // Attendance stats: only count workdays
      const { data: attendance } = await supabase
        .from('attendance')
        .select('status, date')
        .eq('user_id', userId);

      const filtered = (attendance || []).filter(a => isWorkday(a.date));

      const hadir = filtered.filter(a => a.status === 'hadir' || a.status === 'terlambat').length;
      // Add attendance records + approved leave days
      const izinFromAttendance = filtered.filter(a => a.status === 'izin').length;
      const sakitFromAttendance = filtered.filter(a => a.status === 'sakit').length;
      const alpha = filtered.filter(a => a.status === 'alpha').length;

      // Combine: attendance records + approved leave that created attendance records
      // Note: If leave is approved, the cron should have already inserted izin/sakit in attendance
      // So we just count from attendance table
      setTeachingStats({
        total_mengajar: taughtWorkdays.size,
        hadir,
        izin: izinFromAttendance,
        sakit: sakitFromAttendance,
        alpha,
      });
    } catch (error) {
      console.error('Error loading teaching stats:', error);
    }
  };

  const handleSave = async () => {
    if (!profile) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          phone: formData.phone,
        })
        .eq('id', profile.id);

      if (error) throw error;

      toast({
        title: 'Berhasil',
        description: 'Profil berhasil diperbarui',
      });
      
      loadProfile();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Gagal menyimpan profil',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !profile) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Error',
        description: 'File harus berupa gambar',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: 'Error',
        description: 'Ukuran file maksimal 2MB',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${profile.id}/${Date.now()}.${fileExt}`;

      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', profile.id);

      if (updateError) throw updateError;

      toast({
        title: 'Berhasil',
        description: 'Foto profil berhasil diperbarui',
      });
      
      loadProfile();
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Gagal mengunggah foto',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteAvatar = async () => {
    if (!profile?.avatar_url) return;
    if (!confirm('Yakin ingin menghapus foto profil?')) return;

    setUploading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', profile.id);

      if (error) throw error;

      toast({
        title: 'Berhasil',
        description: 'Foto profil berhasil dihapus',
      });
      loadProfile();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Gagal menghapus foto',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getRoleLabel = (role: string | null) => {
    switch (role) {
      case 'admin': return 'Administrator';
      case 'teacher': return 'Guru';
      case 'staff': return 'Staf';
      default: return role || 'User';
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">Profil Saya</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Kelola informasi pribadi Anda</p>
        </div>

        <Card>
          <CardHeader className="pb-2 sm:pb-4 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-sm sm:text-base">Foto Profil</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Klik pada foto untuk mengganti</CardDescription>
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
              <div className="relative group">
                <Avatar className="h-20 w-20 sm:h-24 sm:w-24 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  <AvatarImage src={profile?.avatar_url || ''} alt={profile?.full_name || 'User'} />
                  <AvatarFallback className="text-xl sm:text-2xl bg-primary text-primary-foreground">
                    {getInitials(profile?.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div 
                  className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploading ? (
                    <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 text-white animate-spin" />
                  ) : (
                    <Camera className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                  disabled={uploading}
                />
              </div>
              <div className="text-center sm:text-left">
                <p className="font-medium text-sm sm:text-base text-foreground">{profile?.full_name || 'Pengguna'}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">{getRoleLabel(profile?.role)}</p>
                <p className="text-xs sm:text-sm text-muted-foreground truncate max-w-[200px]">{profile?.email}</p>
                {profile?.avatar_url && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive mt-2 h-7 px-2"
                    onClick={handleDeleteAvatar}
                    disabled={uploading}
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Hapus Foto
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Teaching Stats - Only for teachers */}
        {profile?.role === 'teacher' && (
          <Card>
            <CardHeader className="pb-2 sm:pb-4 px-3 sm:px-6 pt-3 sm:pt-6">
              <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                Statistik Mengajar
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">Rekap aktivitas mengajar (hanya hari kerja)</CardDescription>
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-4">
                <div className="p-2 sm:p-4 bg-primary/10 rounded-lg text-center">
                  <BookOpen className="h-4 w-4 sm:h-6 sm:w-6 mx-auto mb-1 sm:mb-2 text-primary" />
                  <p className="text-lg sm:text-2xl font-bold text-primary">{teachingStats.total_mengajar}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Mengajar</p>
                </div>
                <div className="p-2 sm:p-4 bg-green-500/10 rounded-lg text-center">
                  <CheckCircle className="h-4 w-4 sm:h-6 sm:w-6 mx-auto mb-1 sm:mb-2 text-green-600" />
                  <p className="text-lg sm:text-2xl font-bold text-green-600">{teachingStats.hadir}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Hadir</p>
                </div>
                <div className="p-2 sm:p-4 bg-yellow-500/10 rounded-lg text-center">
                  <Clock className="h-4 w-4 sm:h-6 sm:w-6 mx-auto mb-1 sm:mb-2 text-yellow-600" />
                  <p className="text-lg sm:text-2xl font-bold text-yellow-600">{teachingStats.izin}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Izin</p>
                </div>
                <div className="p-2 sm:p-4 bg-blue-500/10 rounded-lg text-center col-span-1 sm:col-span-1">
                  <AlertTriangle className="h-4 w-4 sm:h-6 sm:w-6 mx-auto mb-1 sm:mb-2 text-blue-600" />
                  <p className="text-lg sm:text-2xl font-bold text-blue-600">{teachingStats.sakit}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Sakit</p>
                </div>
                <div className="p-2 sm:p-4 bg-red-500/10 rounded-lg text-center col-span-2 sm:col-span-1">
                  <XCircle className="h-4 w-4 sm:h-6 sm:w-6 mx-auto mb-1 sm:mb-2 text-red-600" />
                  <p className="text-lg sm:text-2xl font-bold text-red-600">{teachingStats.alpha}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Alpha</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-2 sm:pb-4 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-sm sm:text-base">Informasi Pribadi</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Perbarui informasi pribadi Anda</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4 px-3 sm:px-6 pb-3 sm:pb-6">
            <div className="space-y-1 sm:space-y-2">
              <Label htmlFor="email" className="text-xs sm:text-sm">Email</Label>
              <Input
                id="email"
                value={profile?.email || ''}
                disabled
                className="bg-muted text-xs sm:text-sm h-8 sm:h-10"
              />
              <p className="text-[10px] sm:text-xs text-muted-foreground">Email tidak dapat diubah</p>
            </div>

            <div className="space-y-1 sm:space-y-2">
              <Label htmlFor="full_name" className="text-xs sm:text-sm">Nama Lengkap</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="Masukkan nama lengkap"
                className="text-xs sm:text-sm h-8 sm:h-10"
              />
            </div>

            <div className="space-y-1 sm:space-y-2">
              <Label htmlFor="phone" className="text-xs sm:text-sm">Nomor Telepon</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Masukkan nomor telepon"
                className="text-xs sm:text-sm h-8 sm:h-10"
              />
            </div>

            <div className="space-y-1 sm:space-y-2">
              <Label htmlFor="role" className="text-xs sm:text-sm">Peran</Label>
              <Input
                id="role"
                value={getRoleLabel(profile?.role)}
                disabled
                className="bg-muted text-xs sm:text-sm h-8 sm:h-10"
              />
              <p className="text-[10px] sm:text-xs text-muted-foreground">Peran diatur oleh administrator</p>
            </div>

            <Button onClick={handleSave} disabled={saving} size="sm" className="w-full text-xs sm:text-sm">
              {saving ? (
                <>
                  <Loader2 className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <Save className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                  Simpan Perubahan
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
