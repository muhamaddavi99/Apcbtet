import { ReactNode, useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  LayoutDashboard,
  Calendar,
  Users,
  BookOpen,
  GraduationCap,
  Bell,
  Settings,
  LogOut,
  Menu,
  X,
  QrCode,
  CalendarOff,
  User,
  FileText,
  UserCircle,
  Notebook,
  ClipboardList,
  Mail,
  Printer,
  BarChart3,
  FileCheck,
  Activity,
  FileWarning,
  Server,
  Sparkles,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';
import NotificationBell from './NotificationBell';
import { useSchoolSettings } from '@/contexts/SchoolContext';
import { ThemeToggle } from './ThemeToggle';

interface LayoutProps {
  children: ReactNode;
}

// Define menu items with role access
const allMenuItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard', roles: ['admin', 'teacher', 'staff'] },
  { path: '/absensi', icon: QrCode, label: 'Absensi Guru', roles: ['admin', 'teacher', 'staff'] },
  { path: '/absensi-siswa', icon: Users, label: 'Absensi Siswa', roles: ['admin', 'teacher'] },
  { path: '/jadwal', icon: Calendar, label: 'Jadwal', roles: ['admin', 'teacher', 'staff'] },
  { path: '/jurnal-mengajar', icon: Notebook, label: 'Jurnal Mengajar', roles: ['admin', 'teacher'] },
  { path: '/input-nilai', icon: ClipboardList, label: 'Input Nilai', roles: ['admin', 'teacher'] },
  { path: '/pengumuman', icon: Bell, label: 'Pengumuman', roles: ['admin', 'teacher', 'staff'] },
  { path: '/guru', icon: User, label: 'Data Guru', roles: ['admin'] },
  { path: '/kelas', icon: BookOpen, label: 'Data Kelas', roles: ['admin'] },
  { path: '/mata-pelajaran', icon: BookOpen, label: 'Mata Pelajaran', roles: ['admin'] },
  { path: '/siswa', icon: GraduationCap, label: 'Data Siswa', roles: ['admin', 'teacher'] },
  { path: '/hari-libur', icon: CalendarOff, label: 'Hari Libur', roles: ['admin'] },
  { path: '/rekap', icon: FileText, label: 'Rekap Absensi', roles: ['admin', 'staff'] },
  { path: '/rekap-detail', icon: User, label: 'Absensi Detail', roles: ['admin', 'staff'] },
  { path: '/analytics', icon: BarChart3, label: 'Analytics', roles: ['admin', 'staff'] },
  { path: '/perizinan-guru', icon: FileCheck, label: 'Perizinan Guru', roles: ['admin', 'staff', 'teacher'] },
  { path: '/monitor-mengajar', icon: Activity, label: 'Monitor Mengajar', roles: ['admin', 'staff'] },
  { path: '/laporan-tidak-mengajar', icon: FileWarning, label: 'Laporan Tidak Mengajar', roles: ['admin', 'staff'] },
  { path: '/status', icon: Server, label: 'Status Sistem', roles: ['admin', 'staff'] },
  { path: '/ai-assistant', icon: Sparkles, label: 'AI Asisten', roles: ['admin', 'teacher', 'staff'] },
  { path: '/surat-menyurat', icon: Mail, label: 'Surat Menyurat', roles: ['admin', 'staff'] },
  { path: '/cetak-dokumen', icon: Printer, label: 'Cetak Dokumen', roles: ['admin', 'staff'] },
  { path: '/profile', icon: UserCircle, label: 'Profil Saya', roles: ['admin', 'teacher', 'staff'] },
  { path: '/settings', icon: Settings, label: 'Pengaturan', roles: ['admin'] },
];

export default function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { settings } = useSchoolSettings();

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Fetch profile when user logs in
        if (session?.user) {
          setTimeout(() => {
            fetchProfile(session.user.id);
          }, 0);
        } else {
          setProfile(null);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
        navigate('/auth');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: 'Berhasil logout',
        description: 'Anda telah keluar dari sistem',
      });
      navigate('/auth');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Gagal logout',
        variant: 'destructive',
      });
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrator';
      case 'teacher': return 'Guru';
      case 'staff': return 'Staf';
      default: return role;
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || !profile) {
    navigate('/auth');
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-primary text-primary-foreground shadow-lg">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border-2 border-primary-foreground/20">
              <AvatarImage src={profile?.avatar_url} alt={profile?.full_name} />
              <AvatarFallback className="bg-primary-foreground/10 text-primary-foreground">
                {getInitials(profile?.full_name || 'U')}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="font-bold text-lg">{settings.school_name}</h1>
              <p className="text-xs opacity-90">{profile?.full_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-primary-foreground hover:bg-primary-foreground/10"
            >
              {sidebarOpen ? <X /> : <Menu />}
            </Button>
          </div>
        </div>
      </header>
      
      {/* Desktop Header - User Info */}
      <div className="hidden lg:block fixed top-0 right-0 z-50 bg-background border-b border-border p-4 ml-64 w-[calc(100%-16rem)]">
        <div className="flex items-center justify-end gap-4">
          <ThemeToggle />
          <NotificationBell />
          <Link to="/profile" className="flex items-center gap-3 text-sm hover:opacity-80 transition-opacity">
            <Avatar className="h-10 w-10 border-2 border-border">
              <AvatarImage src={profile?.avatar_url} alt={profile?.full_name} />
              <AvatarFallback className="bg-primary/10 text-primary">
                {getInitials(profile?.full_name || 'U')}
              </AvatarFallback>
            </Avatar>
            <div className="text-right">
              <p className="font-semibold text-foreground">{profile?.full_name}</p>
              <p className="text-xs text-muted-foreground capitalize">
                {getRoleLabel(profile?.role)}
              </p>
            </div>
          </Link>
        </div>
      </div>

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-sidebar text-sidebar-foreground transform transition-all duration-300 ease-in-out z-40 shadow-xl ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="hidden lg:flex items-center gap-3 p-6 border-b border-sidebar-border animate-fade-in">
            <div className="w-12 h-12 bg-sidebar-primary rounded-lg flex items-center justify-center animate-scale-in">
              <GraduationCap className="h-7 w-7 text-sidebar-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="font-bold text-lg truncate">{settings.school_name}</h1>
              <p className="text-xs opacity-80">Sistem Informasi</p>
            </div>
          </div>

          {/* User Profile in Sidebar for Mobile */}
          <div className="lg:hidden p-4 border-b border-sidebar-border mt-16">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12 border-2 border-sidebar-border">
                <AvatarImage src={profile?.avatar_url} alt={profile?.full_name} />
                <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground">
                  {getInitials(profile?.full_name || 'U')}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{profile?.full_name}</p>
                <p className="text-xs opacity-80">{getRoleLabel(profile?.role)}</p>
              </div>
            </div>
          </div>

          {/* Menu */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-1">
            {allMenuItems
              .filter(item => item.roles.includes(profile?.role || ''))
              .map((item, index) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 animate-fade-in hover:scale-105 ${
                      isActive
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-md'
                        : 'hover:bg-sidebar-accent/50 text-sidebar-foreground'
                    }`}
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
          </nav>

          {/* Logout */}
          <div className="p-4 border-t border-sidebar-border">
            <Button
              variant="ghost"
              className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent/50"
              onClick={handleLogout}
            >
              <LogOut className="h-5 w-5 mr-3" />
              Keluar
            </Button>
          </div>
        </div>
      </aside>

      {/* Overlay untuk mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="lg:ml-64 pt-20 lg:pt-20 min-h-screen">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
