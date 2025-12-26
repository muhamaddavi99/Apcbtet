import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GraduationCap, CheckCircle2, Eye, EyeOff, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useSchoolSettings } from '@/contexts/SchoolContext';

export default function ResetPassword() {
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { settings } = useSchoolSettings();

  usePageTitle('Reset Password');

  useEffect(() => {
    // Check if we have a recovery session from the URL hash
    const checkRecoverySession = async () => {
      try {
        // Get the hash parameters from the URL
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const type = hashParams.get('type');
        
        // Also check query params (some Supabase versions use query instead of hash)
        const queryParams = new URLSearchParams(window.location.search);
        const errorCode = queryParams.get('error_code');
        const errorDescription = queryParams.get('error_description');

        // Check for errors in the URL
        if (errorCode || errorDescription) {
          console.log('Error in URL:', errorCode, errorDescription);
          navigate('/link-expired');
          return;
        }

        if (accessToken && type === 'recovery') {
          // Set the session using the tokens from the URL
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || '',
          });

          if (error) {
            console.error('Error setting session:', error);
            navigate('/link-expired');
            return;
          }

          if (data.session) {
            setIsValidSession(true);
          } else {
            navigate('/link-expired');
          }
        } else {
          // Check existing session
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            setIsValidSession(true);
          } else {
            // No valid session, redirect to expired page
            navigate('/link-expired');
          }
        }
      } catch (error) {
        console.error('Error checking recovery session:', error);
        navigate('/link-expired');
      } finally {
        setChecking(false);
      }
    };

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsValidSession(true);
        setChecking(false);
      } else if (event === 'TOKEN_REFRESHED' && session) {
        setIsValidSession(true);
      }
    });

    checkRecoverySession();

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast({
        title: 'Password tidak cocok',
        description: 'Pastikan kedua password sama.',
        variant: 'destructive',
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: 'Password terlalu pendek',
        description: 'Password minimal 6 karakter.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        // Check if the error is due to expired token
        if (error.message.includes('expired') || error.message.includes('invalid')) {
          navigate('/link-expired');
          return;
        }
        throw error;
      }

      setSuccess(true);
      toast({
        title: 'Password berhasil diubah',
        description: 'Anda akan diarahkan ke halaman login.',
        variant: 'success' as any,
      });

      // Sign out and redirect to login after 3 seconds
      setTimeout(async () => {
        await supabase.auth.signOut();
        navigate('/auth');
      }, 3000);
    } catch (error: any) {
      toast({
        title: 'Gagal mengubah password',
        description: error.message || 'Terjadi kesalahan, silakan coba lagi.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Show loading while checking session
  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
            <p className="text-muted-foreground">Memverifikasi link...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4">
      <Card className="w-full max-w-md shadow-xl animate-scale-in">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-primary rounded-2xl flex items-center justify-center animate-bounce-in overflow-hidden">
            {settings.school_icon_url ? (
              <img src={settings.school_icon_url} alt="School Icon" className="w-full h-full object-cover" />
            ) : (
              <GraduationCap className="h-10 w-10 text-primary-foreground" />
            )}
          </div>
          <div className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <CardTitle className="text-2xl font-bold">
              {success ? 'Berhasil!' : 'Buat Password Baru'}
            </CardTitle>
            <CardDescription className="mt-2">
              {success 
                ? 'Password Anda telah berhasil diubah' 
                : 'Masukkan password baru Anda'}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="animate-fade-up" style={{ animationDelay: '0.3s' }}>
          {success ? (
            <div className="space-y-4 text-center">
              <div className="w-20 h-20 mx-auto bg-success/10 rounded-full flex items-center justify-center animate-bounce-in">
                <CheckCircle2 className="h-10 w-10 text-success" />
              </div>
              <p className="text-muted-foreground">
                Anda akan diarahkan ke halaman login dalam beberapa detik...
              </p>
            </div>
          ) : (
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Password Baru</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Konfirmasi Password</Label>
                <Input
                  id="confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <Button type="submit" className="w-full hover-scale" disabled={loading}>
                {loading ? 'Menyimpan...' : 'Simpan Password Baru'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
