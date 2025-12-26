import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GraduationCap, ArrowLeft, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { usePageTitle } from '@/hooks/usePageTitle';

export default function ForgotPassword() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();

  usePageTitle('Lupa Password');

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Get current domain for redirect
      const currentOrigin = window.location.origin;
      const redirectUrl = `${currentOrigin}/reset-password`;
      
      // Call the edge function to send reset email with redirect URL
      const { error } = await supabase.functions.invoke('send-reset-password', {
        body: { email, redirectUrl }
      });

      if (error) throw error;

      setSubmitted(true);
      toast({
        title: 'Email terkirim',
        description: 'Silakan cek inbox email Anda untuk melanjutkan reset password.',
        variant: 'success' as any,
      });
    } catch (error: any) {
      toast({
        title: 'Gagal mengirim email',
        description: error.message || 'Terjadi kesalahan, silakan coba lagi.',
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
          <div className="mx-auto w-16 h-16 bg-primary rounded-2xl flex items-center justify-center animate-bounce-in">
            <GraduationCap className="h-10 w-10 text-primary-foreground" />
          </div>
          <div className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <CardTitle className="text-2xl font-bold">Reset Password</CardTitle>
            <CardDescription className="mt-2">
              {submitted 
                ? 'Email berhasil dikirim!' 
                : 'Masukkan email Anda untuk reset password'}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="animate-fade-up" style={{ animationDelay: '0.3s' }}>
          {submitted ? (
            <div className="space-y-4 text-center">
              <div className="w-20 h-20 mx-auto bg-success/10 rounded-full flex items-center justify-center animate-bounce-in">
                <Mail className="h-10 w-10 text-success" />
              </div>
              <p className="text-muted-foreground">
                Kami telah mengirim link reset password ke <strong>{email}</strong>. 
                Silakan cek inbox atau folder spam Anda.
              </p>
              <Button 
                variant="outline" 
                className="w-full hover-scale" 
                onClick={() => setSubmitted(false)}
              >
                Kirim ulang email
              </Button>
            </div>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="nama@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full hover-scale" disabled={loading}>
                {loading ? 'Mengirim...' : 'Kirim Link Reset'}
              </Button>
            </form>
          )}
          <Link 
            to="/auth" 
            className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mt-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali ke Login
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
