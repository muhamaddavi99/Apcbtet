import { useState, useEffect, useRef } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Bell, Plus, Edit, Trash2, ImagePlus, X, Loader2, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { usePageTitle } from '@/hooks/usePageTitle';
import { sendAnnouncementNotification } from '@/lib/pushNotification';
import { ClickableImage } from '@/components/ui/image-lightbox';

export default function Pengumuman() {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    priority: 'normal',
    image_url: '',
  });
  const [aiImageAvailable, setAiImageAvailable] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  usePageTitle('Pengumuman');

  useEffect(() => {
    loadAnnouncements();
    loadProfile();
    
    // Check if there's an AI-generated image available
    const savedAiImage = localStorage.getItem('ai_image_for_announcement');
    if (savedAiImage) {
      setAiImageAvailable(savedAiImage);
    }
  }, []);

  const loadProfile = async () => {
    const { data: session } = await supabase.auth.getSession();
    if (session.session?.user) {
      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.session.user.id)
        .single();
      setProfile(data);
    }
  };

  const canManageAnnouncements = profile?.role === 'admin' || profile?.role === 'staff';

  const loadAnnouncements = async () => {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAnnouncements(data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Gagal memuat pengumuman',
        variant: 'destructive',
      });
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
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

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Error',
        description: 'Ukuran file maksimal 5MB',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'png';
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `announcements/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setFormData({ ...formData, image_url: publicUrl });
      toast({
        title: 'Berhasil',
        description: 'Gambar berhasil diunggah',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Gagal mengunggah gambar',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const removeImage = () => {
    setFormData({ ...formData, image_url: '' });
  };

  const useAiImage = () => {
    if (aiImageAvailable) {
      setFormData({ ...formData, image_url: aiImageAvailable });
      localStorage.removeItem('ai_image_for_announcement');
      setAiImageAvailable(null);
      toast({
        title: 'Berhasil',
        description: 'Gambar AI berhasil ditambahkan',
      });
    }
  };

  const dismissAiImage = () => {
    localStorage.removeItem('ai_image_for_announcement');
    setAiImageAvailable(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: session } = await supabase.auth.getSession();
      
      if (editId) {
        const { error } = await supabase
          .from('announcements')
          .update({
            title: formData.title,
            content: formData.content,
            priority: formData.priority,
            image_url: formData.image_url || null,
          })
          .eq('id', editId);

        if (error) throw error;
        toast({ title: 'Berhasil', description: 'Pengumuman berhasil diupdate' });
      } else {
        const { error } = await supabase
          .from('announcements')
          .insert([{
            title: formData.title,
            content: formData.content,
            priority: formData.priority,
            image_url: formData.image_url || null,
            created_by: session.session?.user.id,
          }]);

        if (error) throw error;
        
        // Send push notification to all users for new announcement
        try {
          await sendAnnouncementNotification(
            formData.title,
            formData.content,
            formData.priority
          );
        } catch (notifError) {
          console.error('Failed to send push notification:', notifError);
        }
        
        toast({ title: 'Berhasil', description: 'Pengumuman berhasil ditambahkan' });
      }
      setOpen(false);
      setEditId(null);
      setFormData({ title: '', content: '', priority: 'normal', image_url: '' });
      loadAnnouncements();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Gagal menyimpan pengumuman',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (announcement: any) => {
    setEditId(announcement.id);
    setFormData({
      title: announcement.title,
      content: announcement.content,
      priority: announcement.priority || 'normal',
      image_url: announcement.image_url || '',
    });
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menghapus pengumuman ini?')) return;
    try {
      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: 'Berhasil', description: 'Pengumuman berhasil dihapus' });
      loadAnnouncements();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Gagal menghapus pengumuman',
        variant: 'destructive',
      });
    }
  };

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold truncate">Pengumuman</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {canManageAnnouncements ? 'Kelola pengumuman sekolah' : 'Lihat pengumuman sekolah'}
            </p>
          </div>
          {canManageAnnouncements && (
            <Dialog open={open} onOpenChange={(isOpen) => {
              setOpen(isOpen);
              if (!isOpen) {
                setEditId(null);
                setFormData({ title: '', content: '', priority: 'normal', image_url: '' });
              }
            }}>
              <DialogTrigger asChild>
                <Button className="gap-1 sm:gap-2 self-start sm:self-auto" size="sm">
                  <Plus className="h-4 w-4" />
                  <span className="text-xs sm:text-sm">Tambah</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editId ? 'Edit Pengumuman' : 'Tambah Pengumuman'}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Judul</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="content">Isi Pengumuman</Label>
                    <Textarea
                      id="content"
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      rows={5}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Gambar (Opsional)</Label>
                    {/* AI Image suggestion */}
                    {aiImageAvailable && !formData.image_url && (
                      <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                        <div className="flex items-center gap-2 mb-2">
                          <Sparkles className="h-4 w-4 text-primary" />
                          <span className="text-sm font-medium">Gambar dari AI tersedia!</span>
                        </div>
                        <img 
                          src={aiImageAvailable} 
                          alt="AI Generated" 
                          className="w-full h-32 object-cover rounded-lg mb-2"
                        />
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            onClick={useAiImage}
                            className="flex-1"
                          >
                            Gunakan
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={dismissAiImage}
                          >
                            Abaikan
                          </Button>
                        </div>
                      </div>
                    )}
                    {formData.image_url ? (
                      <div className="relative">
                        <img 
                          src={formData.image_url} 
                          alt="Preview" 
                          className="w-full h-40 object-cover rounded-lg"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2 h-8 w-8"
                          onClick={removeImage}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div
                        className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        {uploading ? (
                          <Loader2 className="h-8 w-8 mx-auto animate-spin text-muted-foreground" />
                        ) : (
                          <>
                            <ImagePlus className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                            <p className="text-sm text-muted-foreground">Klik untuk upload gambar</p>
                            <p className="text-xs text-muted-foreground mt-1">Maks. 5MB</p>
                          </>
                        )}
                      </div>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                      disabled={uploading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="priority">Prioritas</Label>
                    <Select
                      value={formData.priority}
                      onValueChange={(value) => setFormData({ ...formData, priority: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Rendah</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="high">Tinggi</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" className="w-full">
                    {editId ? 'Update' : 'Simpan'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="grid gap-4">
          {announcements.length > 0 ? (
            announcements.map((announcement, index) => (
              <Card 
                key={announcement.id} 
                className={`border-l-4 animate-fade-up hover-scale transition-all duration-300 hover:shadow-lg ${
                  announcement.priority === 'high' ? 'border-l-destructive' :
                  announcement.priority === 'normal' ? 'border-l-primary' :
                  'border-l-muted-foreground'
                }`}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <Bell className="h-5 w-5 mt-1 text-primary" />
                      <div>
                        <CardTitle className="text-xl">{announcement.title}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          {new Date(announcement.created_at).toLocaleDateString('id-ID', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </p>
                      </div>
                    </div>
                    {canManageAnnouncements && (
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(announcement)}
                          className="hover:scale-110 transition-transform"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(announcement.id)}
                          className="hover:scale-110 transition-transform"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {announcement.image_url && (
                    <div className="relative w-full overflow-hidden rounded-xl bg-muted/50">
                      <ClickableImage 
                        src={announcement.image_url} 
                        alt={announcement.title}
                        className="w-full h-auto max-h-[400px] object-contain"
                      />
                    </div>
                  )}
                  <p className="whitespace-pre-wrap leading-relaxed">{announcement.content}</p>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Belum ada pengumuman</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  );
}
