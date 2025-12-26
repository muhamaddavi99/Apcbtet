import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { GraduationCap, Download } from 'lucide-react';
import { shouldShowNativeUI } from '@/lib/platform';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useSchoolSettings } from '@/contexts/SchoolContext';
import { usePageTitle } from '@/hooks/usePageTitle';

export default function Auth() {
  const { settings } = useSchoolSettings();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  usePageTitle('Login');

  // Login state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate('/');
      }
    });
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });

      if (error) throw error;

      toast({
        title: 'Berhasil login',
        description: `Selamat datang kembali!`,
      });

      navigate('/');
    } catch (error: any) {
      toast({
        title: 'Login gagal',
        description: error.message || 'Email atau password salah',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4">
      <Card className="w-full max-w-md shadow-xl animate-scale-in">
        <CardHeader className="text-center space-y-4">
          <Avatar className="mx-auto w-16 h-16 animate-bounce-in">
            <AvatarImage src={settings.school_icon_url} alt="School Logo" />
            <AvatarFallback className="bg-primary rounded-2xl">
              <GraduationCap className="h-10 w-10 text-primary-foreground" />
            </AvatarFallback>
          </Avatar>
          <div className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <CardTitle className="text-2xl font-bold">{settings.school_name}</CardTitle>
            <CardDescription className="mt-2">
              Sistem Informasi Guru & Staf
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="animate-fade-up" style={{ animationDelay: '0.3s' }}>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login-email">Email</Label>
              <Input
                id="login-email"
                type="email"
                placeholder="nama@example.com"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="login-password">Password</Label>
              <Input
                id="login-password"
                type="password"
                placeholder="••••••••"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full hover-scale" disabled={loading}>
              {loading ? 'Memproses...' : 'Login'}
            </Button>
            <div className="text-center mt-2">
              <Link 
                to="/forgot-password" 
                className="text-sm text-primary hover:underline transition-colors"
              >
                Lupa password?
              </Link>
            </div>
          </form>
          <p className="text-xs text-center text-muted-foreground mt-4">
            Hubungi admin untuk membuat akun baru
          </p>
          
          {/* Download APK link - only show on web */}
          {!shouldShowNativeUI() && (
            <div className="mt-4 pt-4 border-t">
              <Link 
                to="/download" 
                className="flex items-center justify-center gap-2 text-sm text-primary hover:underline transition-colors"
              >
                <Download className="h-4 w-4" />
                Download Aplikasi Android
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
