import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GraduationCap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function Setup() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    nip: '',
    full_name: '',
  });

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Create the admin account
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            nip: formData.nip,
            full_name: formData.full_name,
            role: 'admin',
            can_teach: false,
          },
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (error) throw error;

      toast({
        title: 'Akun admin berhasil dibuat',
        description: 'Silakan login dengan akun yang baru dibuat',
      });

      navigate('/auth');
    } catch (error: any) {
      toast({
        title: 'Gagal membuat akun',
        description: error.message,
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
            <CardTitle className="text-2xl font-bold">Setup Admin Pertama</CardTitle>
            <CardDescription className="mt-2">
              Buat akun administrator pertama untuk sistem
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="animate-fade-up" style={{ animationDelay: '0.3s' }}>
          <form onSubmit={handleSetup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Nama Lengkap</Label>
              <Input
                id="full_name"
                type="text"
                placeholder="Nama lengkap admin"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nip">NIP</Label>
              <Input
                id="nip"
                type="text"
                placeholder="Nomor Induk Pegawai"
                value={formData.nip}
                onChange={(e) => setFormData({ ...formData, nip: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@maittifaqiah.sch.id"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Minimal 6 karakter"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                minLength={6}
              />
            </div>
            <Button type="submit" className="w-full hover-scale" disabled={loading}>
              {loading ? 'Membuat akun...' : 'Buat Akun Admin'}
            </Button>
          </form>
          <p className="text-xs text-center text-muted-foreground mt-4">
            Halaman ini hanya untuk setup pertama kali
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
