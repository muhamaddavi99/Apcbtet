import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UserPlus, Edit, Trash2, Mail, Phone, BookOpen } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { usePageTitle } from '@/hooks/usePageTitle';

interface Guru {
  id: string;
  nip: string;
  full_name: string;
  email: string;
  phone: string | null;
  subject: string | null;
  role: string;
  can_teach: boolean | null;
}

export default function Guru() {
  const [guruList, setGuruList] = useState<Guru[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentGuru, setCurrentGuru] = useState<Guru | null>(null);
  const { toast } = useToast();

  usePageTitle('Data Guru & Staf');

  const [formData, setFormData] = useState({
    nip: '',
    full_name: '',
    email: '',
    password: '',
    phone: '',
    subject: '',
    role: 'teacher',
    can_teach: false,
  });

  useEffect(() => {
    loadGuru();
  }, []);

  const loadGuru = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .in('role', ['teacher', 'staff', 'admin']);

      if (error) throw error;
      setGuruList(data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Gagal memuat data guru',
        variant: 'destructive',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editMode && currentGuru) {
        // Update profile
        const { error } = await supabase
          .from('profiles')
          .update({
            nip: formData.nip,
            full_name: formData.full_name,
            email: formData.email,
            phone: formData.phone,
            subject: formData.subject,
            role: formData.role,
            can_teach: formData.can_teach,
          })
          .eq('id', currentGuru.id);

        if (error) throw error;

        toast({
          title: 'Berhasil',
          description: 'Data guru berhasil diupdate',
        });
      } else {
        // Create new user via auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              nip: formData.nip,
              full_name: formData.full_name,
              role: formData.role,
              subject: formData.subject,
              phone: formData.phone,
              can_teach: formData.can_teach,
            },
            emailRedirectTo: `${window.location.origin}/`,
          },
        });

        if (authError) throw authError;

        toast({
          title: 'Berhasil',
          description: 'Akun guru berhasil dibuat',
        });
      }
      
      setDialogOpen(false);
      resetForm();
      loadGuru();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Gagal menyimpan data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (guru: Guru) => {
    setCurrentGuru(guru);
    setFormData({
      nip: guru.nip,
      full_name: guru.full_name,
      email: guru.email,
      password: '',
      phone: guru.phone || '',
      subject: guru.subject || '',
      role: guru.role,
      can_teach: guru.can_teach || false,
    });
    setEditMode(true);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menghapus data guru ini? Akun autentikasi juga akan dihapus.')) return;

    try {
      // Call edge function to delete user from auth (which cascades to profile)
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ userId: id }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Gagal menghapus user');
      }
      
      toast({
        title: 'Berhasil',
        description: 'Data guru dan akun berhasil dihapus',
      });
      loadGuru();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Gagal menghapus data',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      nip: '',
      full_name: '',
      email: '',
      password: '',
      phone: '',
      subject: '',
      role: 'teacher',
      can_teach: false,
    });
    setEditMode(false);
    setCurrentGuru(null);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    resetForm();
  };

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold truncate">Data Guru & Staf</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Kelola akun guru dan staf</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => resetForm()} size="sm" className="self-start sm:self-auto">
                <UserPlus className="h-4 w-4 mr-1 sm:mr-2" />
                <span className="text-xs sm:text-sm">Tambah</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editMode ? 'Edit Data Guru' : 'Tambah Guru Baru'}
                </DialogTitle>
                <DialogDescription>
                  {editMode
                    ? 'Perbarui informasi guru'
                    : 'Buat akun baru untuk guru atau staf'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nip">NIP</Label>
                  <Input
                    id="nip"
                    placeholder="1234567890"
                    value={formData.nip}
                    onChange={(e) => setFormData({ ...formData, nip: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="full_name">Nama Lengkap</Label>
                  <Input
                    id="full_name"
                    placeholder="Nama Guru"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="guru@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    disabled={editMode}
                  />
                </div>
                {!editMode && (
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                      minLength={6}
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="phone">No. Telepon</Label>
                  <Input
                    id="phone"
                    placeholder="08123456789"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subject">Mata Pelajaran</Label>
                  <Input
                    id="subject"
                    placeholder="Matematika"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value) => setFormData({ ...formData, role: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="teacher">Guru</SelectItem>
                      <SelectItem value="staff">Staf</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={handleDialogClose} className="flex-1">
                    Batal
                  </Button>
                  <Button type="submit" disabled={loading} className="flex-1">
                    {loading ? 'Menyimpan...' : editMode ? 'Update' : 'Simpan'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="animate-fade-up">
          <CardHeader>
            <CardTitle>Daftar Guru & Staf</CardTitle>
          </CardHeader>
          <CardContent>
            {guruList.length > 0 ? (
              <div className="space-y-3">
                {guruList.map((guru, index) => (
                  <div
                    key={guru.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-all duration-300 hover:scale-[1.01] hover:shadow-md animate-fade-in"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg">{guru.full_name}</h3>
                        <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full">
                          {guru.role === 'teacher' ? 'Guru' : guru.role === 'staff' ? 'Staf' : 'Admin'}
                          {guru.role === 'staff' && guru.can_teach && ' (Dapat Mengajar)'}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <BookOpen className="h-3.5 w-3.5" />
                          NIP: {guru.nip}
                        </span>
                        {guru.subject && (
                          <span className="flex items-center gap-1">
                            <BookOpen className="h-3.5 w-3.5" />
                            {guru.subject}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Mail className="h-3.5 w-3.5" />
                          {guru.email}
                        </span>
                        {guru.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3.5 w-3.5" />
                            {guru.phone}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(guru)}
                        className="hover:scale-110 transition-transform"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(guru.id)}
                        className="hover:scale-110 transition-transform"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Belum ada data guru
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
