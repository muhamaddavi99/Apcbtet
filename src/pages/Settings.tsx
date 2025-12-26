import { useState, useEffect, useRef } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Settings as SettingsIcon, User, Bell, Shield, Building2, Loader2, Camera, GraduationCap, Send, Download, Upload, Database, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSchoolSettings } from '@/contexts/SchoolContext';
import { usePageTitle } from '@/hooks/usePageTitle';
import { sendPushNotification } from '@/lib/pushNotification';
import { VersionManager } from '@/components/admin/VersionManager';
import { APP_VERSION } from '@/lib/platform';

export default function Settings() {
  const { settings: schoolSettings, updateSettings } = useSchoolSettings();
  const [localSettings, setLocalSettings] = useState(schoolSettings);
  const [notifications, setNotifications] = useState(true);
  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: '',
  });
  const [loading, setLoading] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const [deletingIcon, setDeletingIcon] = useState(false);
  const [testingNotification, setTestingNotification] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const iconInputRef = useRef<HTMLInputElement>(null);
  const restoreInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  usePageTitle('Pengaturan');

  useEffect(() => {
    setLocalSettings(schoolSettings);
    const savedNotifications = localStorage.getItem('notifications');
    if (savedNotifications) {
      setNotifications(JSON.parse(savedNotifications));
    }
  }, [schoolSettings]);

  const handleSaveSettings = async () => {
    setLoading(true);
    try {
      await updateSettings(localSettings);
      localStorage.setItem('notifications', JSON.stringify(notifications));
      
      toast({
        title: 'Berhasil',
        description: 'Pengaturan berhasil disimpan ke database. Perubahan telah diterapkan di seluruh sistem.',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Gagal menyimpan pengaturan',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwords.current || !passwords.new || !passwords.confirm) {
      toast({
        title: 'Error',
        description: 'Semua field password harus diisi',
        variant: 'destructive',
      });
      return;
    }

    if (passwords.new !== passwords.confirm) {
      toast({
        title: 'Error',
        description: 'Password baru dan konfirmasi tidak cocok',
        variant: 'destructive',
      });
      return;
    }

    if (passwords.new.length < 6) {
      toast({
        title: 'Error',
        description: 'Password baru minimal 6 karakter',
        variant: 'destructive',
      });
      return;
    }

    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwords.new,
      });

      if (error) throw error;

      toast({
        title: 'Berhasil',
        description: 'Password berhasil diubah',
      });
      setPasswords({ current: '', new: '', confirm: '' });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Gagal mengubah password',
        variant: 'destructive',
      });
    } finally {
      setChangingPassword(false);
    }
  };

  const handleIconUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Error',
        description: 'File harus berupa gambar',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: 'Error',
        description: 'Ukuran file maksimal 2MB',
        variant: 'destructive',
      });
      return;
    }

    setUploadingIcon(true);
    try {
      // Check if user is authenticated
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) {
        console.error('Auth error:', authError);
        throw new Error('Gagal memverifikasi login. Silakan refresh halaman dan login ulang.');
      }
      if (!user) {
        throw new Error('Anda harus login untuk mengunggah icon sekolah');
      }

      // Check if user is admin
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) {
        console.error('Profile error:', profileError);
        throw new Error('Gagal memverifikasi role. Silakan refresh halaman.');
      }

      if (profile?.role !== 'admin') {
        throw new Error('Hanya admin yang dapat mengunggah icon sekolah');
      }

      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'png';
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `school-icons/${fileName}`;

      // Delete old icon if exists
      if (localSettings.school_icon_url) {
        try {
          const oldPath = localSettings.school_icon_url.split('/avatars/')[1];
          if (oldPath && oldPath.startsWith('school-icons/')) {
            await supabase.storage.from('avatars').remove([oldPath]);
          }
        } catch (e) {
          console.log('Could not delete old icon:', e);
        }
      }

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { 
          upsert: true,
          contentType: file.type 
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        if (uploadError.message?.includes('row-level security') || uploadError.message?.includes('policy')) {
          throw new Error('Anda tidak memiliki izin untuk upload. Pastikan Anda login sebagai admin.');
        }
        throw new Error(uploadError.message || 'Gagal mengunggah file');
      }

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setLocalSettings({ ...localSettings, school_icon_url: publicUrl });
      
      toast({
        title: 'Berhasil',
        description: 'Icon sekolah berhasil diunggah. Klik "Simpan Pengaturan" untuk menyimpan perubahan.',
      });
    } catch (error: any) {
      console.error('Icon upload error:', error);
      let errorMessage = 'Gagal mengunggah icon.';
      
      if (error.message === 'Failed to fetch') {
        errorMessage = 'Koneksi ke server gagal. Periksa koneksi internet Anda dan coba lagi.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setUploadingIcon(false);
    }
  };

  const handleDeleteSchoolIcon = async () => {
    if (!localSettings.school_icon_url) {
      toast({
        title: 'Info',
        description: 'Tidak ada foto sekolah untuk dihapus',
      });
      return;
    }

    setDeletingIcon(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Anda harus login');

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      if (profile?.role !== 'admin') {
        throw new Error('Hanya admin yang dapat menghapus foto sekolah');
      }

      // Delete from storage
      const oldPath = localSettings.school_icon_url.split('/avatars/')[1];
      if (oldPath && oldPath.startsWith('school-icons/')) {
        await supabase.storage.from('avatars').remove([oldPath]);
      }

      // Update local settings
      setLocalSettings({ ...localSettings, school_icon_url: '' });
      
      toast({
        title: 'Berhasil',
        description: 'Foto sekolah berhasil dihapus. Klik "Simpan Pengaturan" untuk menyimpan perubahan.',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Gagal menghapus foto sekolah',
        variant: 'destructive',
      });
    } finally {
      setDeletingIcon(false);
    }
  };

  const handleTestNotification = async () => {
    setTestingNotification(true);
    try {
      const result = await sendPushNotification({
        title: '🔔 Test Notifikasi',
        body: 'Ini adalah notifikasi percobaan dari sistem. Jika Anda melihat pesan ini, notifikasi berfungsi dengan baik!',
        tag: 'test-notification',
        url: '/settings',
      });

      if (result.success) {
        if (result.sent === 0) {
          toast({
            title: 'Tidak ada perangkat',
            description: 'Belum ada perangkat yang terdaftar. Silakan aktifkan notifikasi terlebih dahulu melalui banner di Dashboard.',
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Berhasil',
            description: `Notifikasi berhasil dikirim ke ${result.sent} perangkat`,
          });
        }
      } else {
        toast({
          title: 'Gagal',
          description: result.error || 'Gagal mengirim notifikasi',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Terjadi kesalahan saat mengirim notifikasi',
        variant: 'destructive',
      });
    } finally {
      setTestingNotification(false);
    }
  };

  const handleBackupData = async () => {
    setBackingUp(true);
    try {
      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Anda harus login untuk backup data');
      }

      // Fetch all data from tables
      const [
        { data: students },
        { data: classes },
        { data: subjects },
        { data: schedules },
        { data: profiles },
        { data: attendance },
        { data: studentAttendance },
        { data: holidays },
        { data: announcements },
        { data: schoolSettingsData },
      ] = await Promise.all([
        supabase.from('students').select('*'),
        supabase.from('classes').select('*'),
        supabase.from('subjects').select('*'),
        supabase.from('schedules').select('*'),
        supabase.from('profiles').select('*'),
        supabase.from('attendance').select('*'),
        supabase.from('student_attendance').select('*'),
        supabase.from('holidays').select('*'),
        supabase.from('announcements').select('*'),
        supabase.from('school_settings').select('*'),
      ]);

      const backupData = {
        version: '1.0',
        created_at: new Date().toISOString(),
        created_by: user.email,
        data: {
          students: students || [],
          classes: classes || [],
          subjects: subjects || [],
          schedules: schedules || [],
          profiles: profiles || [],
          attendance: attendance || [],
          student_attendance: studentAttendance || [],
          holidays: holidays || [],
          announcements: announcements || [],
          school_settings: schoolSettingsData || [],
        },
      };

      // Create and download the backup file
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-sekolah-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: 'Berhasil',
        description: 'Data berhasil dibackup. File akan terunduh otomatis.',
      });
    } catch (error: any) {
      console.error('Backup error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Gagal melakukan backup data',
        variant: 'destructive',
      });
    } finally {
      setBackingUp(false);
    }
  };

  const handleRestoreData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      toast({
        title: 'Error',
        description: 'File harus berformat JSON',
        variant: 'destructive',
      });
      return;
    }

    setRestoring(true);
    try {
      // Check if user is authenticated and is admin
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Anda harus login untuk restore data');
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'admin') {
        throw new Error('Hanya admin yang dapat restore data');
      }

      const text = await file.text();
      const backupData = JSON.parse(text);

      if (!backupData.version || !backupData.data) {
        throw new Error('Format file backup tidak valid');
      }

      // Restore school settings if available
      if (backupData.data.school_settings && backupData.data.school_settings.length > 0) {
        const settingsToRestore = backupData.data.school_settings[0];
        await supabase
          .from('school_settings')
          .update({
            school_name: settingsToRestore.school_name,
            school_address: settingsToRestore.school_address,
            school_phone: settingsToRestore.school_phone,
            school_icon_url: settingsToRestore.school_icon_url,
            check_in_time: settingsToRestore.check_in_time,
            late_time: settingsToRestore.late_time,
            check_out_time: settingsToRestore.check_out_time,
          })
          .eq('id', localSettings.id || settingsToRestore.id);

        // Update local settings
        setLocalSettings({
          ...localSettings,
          school_name: settingsToRestore.school_name || localSettings.school_name,
          school_address: settingsToRestore.school_address || '',
          school_phone: settingsToRestore.school_phone || '',
          school_icon_url: settingsToRestore.school_icon_url || '',
          check_in_time: settingsToRestore.check_in_time?.slice(0, 5) || localSettings.check_in_time,
          late_time: settingsToRestore.late_time?.slice(0, 5) || localSettings.late_time,
          check_out_time: settingsToRestore.check_out_time?.slice(0, 5) || localSettings.check_out_time,
        });
      }

      toast({
        title: 'Berhasil',
        description: 'Pengaturan sekolah berhasil di-restore. Refresh halaman untuk melihat perubahan.',
      });

      // Reset the input
      if (restoreInputRef.current) {
        restoreInputRef.current.value = '';
      }
    } catch (error: any) {
      console.error('Restore error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Gagal melakukan restore data',
        variant: 'destructive',
      });
    } finally {
      setRestoring(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6 animate-fade-in">
        <div className="flex items-center gap-2 sm:gap-3">
          <SettingsIcon className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">Pengaturan</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Kelola pengaturan sistem absensi</p>
          </div>
        </div>

        <div className="grid gap-4 sm:gap-6">
          {/* School Information */}
          <Card className="animate-fade-up">
            <CardHeader className="pb-2 sm:pb-4 px-3 sm:px-6 pt-3 sm:pt-6">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                <CardTitle className="text-sm sm:text-base">Informasi Sekolah</CardTitle>
              </div>
              <CardDescription className="text-xs sm:text-sm">
                Kelola informasi dasar sekolah
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4 px-3 sm:px-6 pb-3 sm:pb-6">
              {/* School Icon Upload */}
              <div className="space-y-2">
                <Label className="text-xs sm:text-sm">Icon/Logo Sekolah</Label>
                <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
                  <div className="relative group">
                    <Avatar className="h-16 w-16 sm:h-20 sm:w-20 cursor-pointer" onClick={() => iconInputRef.current?.click()}>
                      <AvatarImage src={localSettings.school_icon_url} alt="School Icon" />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        <GraduationCap className="h-8 w-8 sm:h-10 sm:w-10" />
                      </AvatarFallback>
                    </Avatar>
                    <div 
                      className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      onClick={() => iconInputRef.current?.click()}
                    >
                      {uploadingIcon ? (
                        <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 text-white animate-spin" />
                      ) : (
                        <Camera className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                      )}
                    </div>
                    <input
                      ref={iconInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleIconUpload}
                      disabled={uploadingIcon}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
                      <p>Klik untuk upload logo</p>
                      <p>JPG, PNG (Maks. 2MB)</p>
                    </div>
                    {localSettings.school_icon_url && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleDeleteSchoolIcon}
                        disabled={deletingIcon}
                        className="w-fit"
                      >
                        {deletingIcon ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4 mr-1" />
                        )}
                        Hapus Foto
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-1 sm:space-y-2">
                <Label htmlFor="schoolName" className="text-xs sm:text-sm">Nama Sekolah</Label>
                <Input
                  className="text-xs sm:text-sm h-8 sm:h-10"
                  id="schoolName"
                  value={localSettings.school_name}
                  onChange={(e) => setLocalSettings({ ...localSettings, school_name: e.target.value })}
                  placeholder="Masukkan nama sekolah"
                />
              </div>
              <div className="space-y-1 sm:space-y-2">
                <Label htmlFor="schoolAddress" className="text-xs sm:text-sm">Alamat Sekolah</Label>
                <Input
                  id="schoolAddress"
                  value={localSettings.school_address}
                  onChange={(e) => setLocalSettings({ ...localSettings, school_address: e.target.value })}
                  placeholder="Masukkan alamat sekolah"
                  className="text-xs sm:text-sm h-8 sm:h-10"
                />
              </div>
              <div className="space-y-1 sm:space-y-2">
                <Label htmlFor="schoolPhone" className="text-xs sm:text-sm">Nomor Telepon</Label>
                <Input
                  id="schoolPhone"
                  value={localSettings.school_phone}
                  onChange={(e) => setLocalSettings({ ...localSettings, school_phone: e.target.value })}
                  placeholder="Masukkan nomor telepon"
                  className="text-xs sm:text-sm h-8 sm:h-10"
                />
              </div>
            </CardContent>
          </Card>

          {/* Account Settings */}
          <Card className="animate-fade-up" style={{ animationDelay: '0.1s' }}>
            <CardHeader className="pb-2 sm:pb-4 px-3 sm:px-6 pt-3 sm:pt-6">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                <CardTitle className="text-sm sm:text-base">Akun</CardTitle>
              </div>
              <CardDescription className="text-xs sm:text-sm">
                Pengaturan akun dan keamanan
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4 px-3 sm:px-6 pb-3 sm:pb-6">
              <div className="space-y-1 sm:space-y-2">
                <Label htmlFor="currentPassword" className="text-xs sm:text-sm">Password Lama</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={passwords.current}
                  onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                  placeholder="Masukkan password lama"
                  className="text-xs sm:text-sm h-8 sm:h-10"
                />
              </div>
              <div className="space-y-1 sm:space-y-2">
                <Label htmlFor="newPassword" className="text-xs sm:text-sm">Password Baru</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={passwords.new}
                  onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                  placeholder="Masukkan password baru"
                  className="text-xs sm:text-sm h-8 sm:h-10"
                />
              </div>
              <div className="space-y-1 sm:space-y-2">
                <Label htmlFor="confirmPassword" className="text-xs sm:text-sm">Konfirmasi Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={passwords.confirm}
                  onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                  placeholder="Konfirmasi password baru"
                  className="text-xs sm:text-sm h-8 sm:h-10"
                />
              </div>
              <Button 
                variant="outline" 
                size="sm"
                className="w-full text-xs sm:text-sm" 
                onClick={handleChangePassword}
                disabled={changingPassword}
              >
                {changingPassword && <Loader2 className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 animate-spin" />}
                Ubah Password
              </Button>
            </CardContent>
          </Card>

          {/* Notification Settings */}
          <Card className="animate-fade-up" style={{ animationDelay: '0.2s' }}>
            <CardHeader className="pb-2 sm:pb-4 px-3 sm:px-6 pt-3 sm:pt-6">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                <CardTitle className="text-sm sm:text-base">Notifikasi</CardTitle>
              </div>
              <CardDescription className="text-xs sm:text-sm">
                Kelola preferensi notifikasi
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4 px-3 sm:px-6 pb-3 sm:pb-6">
              <div className="flex items-center justify-between gap-2">
                <div className="space-y-0.5 min-w-0">
                  <Label htmlFor="notifications" className="text-xs sm:text-sm">Notifikasi Push</Label>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">
                    Terima notifikasi aktivitas penting
                  </p>
                </div>
                <Switch
                  id="notifications"
                  checked={notifications}
                  onCheckedChange={setNotifications}
                />
              </div>
              <div className="pt-3 sm:pt-4 border-t">
                <div className="flex items-center justify-between gap-2">
                  <div className="space-y-0.5 min-w-0">
                    <Label className="text-xs sm:text-sm">Test Notifikasi</Label>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">
                      Kirim notifikasi percobaan
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="text-xs flex-shrink-0"
                    onClick={handleTestNotification}
                    disabled={testingNotification}
                  >
                    {testingNotification ? (
                      <Loader2 className="mr-1 h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                    ) : (
                      <Send className="mr-1 h-3 w-3 sm:h-4 sm:w-4" />
                    )}
                    <span className="hidden sm:inline">Test</span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* System Settings */}
          <Card className="animate-fade-up" style={{ animationDelay: '0.3s' }}>
            <CardHeader className="pb-2 sm:pb-4 px-3 sm:px-6 pt-3 sm:pt-6">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                <CardTitle className="text-sm sm:text-base">Sistem</CardTitle>
              </div>
              <CardDescription className="text-xs sm:text-sm">
                Pengaturan waktu absensi
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4 px-3 sm:px-6 pb-3 sm:pb-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <div className="space-y-1 sm:space-y-2">
                  <Label className="text-xs sm:text-sm">Jam Masuk</Label>
                  <Input 
                    type="time" 
                    value={localSettings.check_in_time}
                    onChange={(e) => setLocalSettings({ ...localSettings, check_in_time: e.target.value })}
                    className="text-xs sm:text-sm h-8 sm:h-10"
                  />
                </div>
                <div className="space-y-1 sm:space-y-2">
                  <Label className="text-xs sm:text-sm">Batas Terlambat</Label>
                  <Input 
                    type="time" 
                    value={localSettings.late_time}
                    onChange={(e) => setLocalSettings({ ...localSettings, late_time: e.target.value })}
                    className="text-xs sm:text-sm h-8 sm:h-10"
                  />
                </div>
                <div className="space-y-1 sm:space-y-2">
                  <Label className="text-xs sm:text-sm">Jam Pulang</Label>
                  <Input 
                    type="time" 
                    value={localSettings.check_out_time}
                    onChange={(e) => setLocalSettings({ ...localSettings, check_out_time: e.target.value })}
                    className="text-xs sm:text-sm h-8 sm:h-10"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Backup & Restore */}
          <Card className="animate-fade-up" style={{ animationDelay: '0.4s' }}>
            <CardHeader className="pb-2 sm:pb-4 px-3 sm:px-6 pt-3 sm:pt-6">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                <CardTitle className="text-sm sm:text-base">Backup & Restore</CardTitle>
              </div>
              <CardDescription className="text-xs sm:text-sm">
                Backup dan restore data sekolah
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4 px-3 sm:px-6 pb-3 sm:pb-6">
              <div className="flex items-center justify-between gap-2">
                <div className="space-y-0.5 min-w-0">
                  <Label className="text-xs sm:text-sm">Backup Data</Label>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">
                    Unduh data dalam format JSON
                  </p>
                </div>
                <Button 
                  variant="outline"
                  size="sm"
                  className="text-xs flex-shrink-0"
                  onClick={handleBackupData}
                  disabled={backingUp}
                >
                  {backingUp ? (
                    <Loader2 className="mr-1 h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                  ) : (
                    <Download className="mr-1 h-3 w-3 sm:h-4 sm:w-4" />
                  )}
                  <span className="hidden sm:inline">Backup</span>
                </Button>
              </div>
              <div className="pt-3 sm:pt-4 border-t">
                <div className="flex items-center justify-between gap-2">
                  <div className="space-y-0.5 min-w-0">
                    <Label className="text-xs sm:text-sm">Restore Data</Label>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">
                      Pulihkan dari file backup
                    </p>
                  </div>
                  <div>
                    <input
                      ref={restoreInputRef}
                      type="file"
                      accept=".json"
                      className="hidden"
                      onChange={handleRestoreData}
                      disabled={restoring}
                    />
                    <Button 
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => restoreInputRef.current?.click()}
                      disabled={restoring}
                    >
                      {restoring ? (
                        <Loader2 className="mr-1 h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                      ) : (
                        <Upload className="mr-1 h-3 w-3 sm:h-4 sm:w-4" />
                      )}
                      <span className="hidden sm:inline">Restore</span>
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Version Management - Admin Only */}
          <VersionManager />

          {/* Current App Version Info */}
          <Card className="animate-fade-up" style={{ animationDelay: '0.5s' }}>
            <CardContent className="py-4 px-6">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Versi Aplikasi
                </div>
                <div className="text-sm font-medium">
                  v{APP_VERSION}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
            <Button variant="outline" size="sm" className="text-xs sm:text-sm">Batal</Button>
            <Button onClick={handleSaveSettings} disabled={loading} size="sm" className="text-xs sm:text-sm transition-transform hover:scale-105">
              {loading && <Loader2 className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 animate-spin" />}
              Simpan Pengaturan
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
