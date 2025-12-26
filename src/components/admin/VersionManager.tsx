import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Edit2, Loader2, Upload, Package, Download, FileUp } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

interface AppVersion {
  id: string;
  version_code: number;
  version_name: string;
  release_notes: string | null;
  download_url: string | null;
  is_force_update: boolean;
  is_active: boolean;
  platform: string;
  created_at: string;
}

export function VersionManager() {
  const [versions, setVersions] = useState<AppVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVersion, setEditingVersion] = useState<AppVersion | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    version_code: 1,
    version_name: '1.0.0',
    release_notes: '',
    download_url: '',
    is_force_update: false,
    is_active: true,
    platform: 'android',
  });
  const { toast } = useToast();

  const fetchVersions = async () => {
    try {
      const { data, error } = await supabase
        .from('app_versions')
        .select('*')
        .order('version_code', { ascending: false });

      if (error) throw error;
      setVersions(data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Gagal memuat data versi',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVersions();
  }, []);

  const resetForm = () => {
    setFormData({
      version_code: versions.length > 0 ? Math.max(...versions.map(v => v.version_code)) + 1 : 1,
      version_name: '',
      release_notes: '',
      download_url: '',
      is_force_update: false,
      is_active: true,
      platform: 'android',
    });
    setEditingVersion(null);
  };

  const handleOpenDialog = (version?: AppVersion) => {
    if (version) {
      setEditingVersion(version);
      setFormData({
        version_code: version.version_code,
        version_name: version.version_name,
        release_notes: version.release_notes || '',
        download_url: version.download_url || '',
        is_force_update: version.is_force_update,
        is_active: version.is_active,
        platform: version.platform,
      });
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const handleFileUpload = async (file: File) => {
    if (!file) return null;

    // Validate file type
    const allowedTypes = ['.apk', '.aab', '.ipa'];
    const fileName = file.name.toLowerCase();
    const isValidType = allowedTypes.some(type => fileName.endsWith(type));
    
    if (!isValidType) {
      toast({
        title: 'Error',
        description: 'Hanya file APK, AAB, atau IPA yang diperbolehkan',
        variant: 'destructive',
      });
      return null;
    }

    // Validate file size (max 200MB)
    const maxSize = 200 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: 'Error',
        description: 'Ukuran file maksimal 200MB',
        variant: 'destructive',
      });
      return null;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const fileExt = fileName.split('.').pop();
      const filePath = `${formData.version_name.replace(/\./g, '_')}_${Date.now()}.${fileExt}`;

      // Simulate progress for UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const { data, error } = await supabase.storage
        .from('app-releases')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      clearInterval(progressInterval);

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('app-releases')
        .getPublicUrl(filePath);

      setUploadProgress(100);
      
      toast({ title: 'Berhasil', description: 'File berhasil diupload' });
      
      // Update form with download URL
      setFormData(prev => ({ ...prev, download_url: publicUrl }));
      
      return publicUrl;
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Gagal mengupload file',
        variant: 'destructive',
      });
      return null;
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  const handleSave = async () => {
    if (!formData.version_name.trim()) {
      toast({
        title: 'Error',
        description: 'Nama versi wajib diisi',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (editingVersion) {
        const { error } = await supabase
          .from('app_versions')
          .update({
            version_code: formData.version_code,
            version_name: formData.version_name,
            release_notes: formData.release_notes || null,
            download_url: formData.download_url || null,
            is_force_update: formData.is_force_update,
            is_active: formData.is_active,
            platform: formData.platform,
          })
          .eq('id', editingVersion.id);

        if (error) throw error;
        toast({ title: 'Berhasil', description: 'Versi berhasil diupdate' });
      } else {
        const { error } = await supabase
          .from('app_versions')
          .insert({
            ...formData,
            release_notes: formData.release_notes || null,
            download_url: formData.download_url || null,
            created_by: user?.id,
          });

        if (error) throw error;
        toast({ title: 'Berhasil', description: 'Versi baru berhasil ditambahkan' });
      }

      setDialogOpen(false);
      fetchVersions();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Gagal menyimpan versi',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menghapus versi ini?')) return;

    try {
      const { error } = await supabase
        .from('app_versions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: 'Berhasil', description: 'Versi berhasil dihapus' });
      fetchVersions();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Gagal menghapus versi',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2 sm:pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-lg">Manajemen Versi Aplikasi</CardTitle>
              <CardDescription>Kelola versi dan update aplikasi</CardDescription>
            </div>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()} size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Tambah Versi
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingVersion ? 'Edit Versi' : 'Tambah Versi Baru'}
                </DialogTitle>
                <DialogDescription>
                  {editingVersion ? 'Ubah informasi versi aplikasi' : 'Tambahkan versi baru aplikasi'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Kode Versi</Label>
                    <Input
                      type="number"
                      value={formData.version_code}
                      onChange={(e) => setFormData({ ...formData, version_code: parseInt(e.target.value) || 1 })}
                      min={1}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Nama Versi</Label>
                    <Input
                      placeholder="1.0.0"
                      value={formData.version_name}
                      onChange={(e) => setFormData({ ...formData, version_name: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Platform</Label>
                  <Select
                    value={formData.platform}
                    onValueChange={(value) => setFormData({ ...formData, platform: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="android">Android</SelectItem>
                      <SelectItem value="ios">iOS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Upload APK/IPA</Label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".apk,.aab,.ipa"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file);
                    }}
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1 gap-2"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                    >
                      {uploading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <FileUp className="h-4 w-4" />
                      )}
                      {uploading ? 'Mengupload...' : 'Pilih File'}
                    </Button>
                  </div>
                  {uploadProgress > 0 && (
                    <Progress value={uploadProgress} className="h-2" />
                  )}
                  {formData.download_url && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted p-2 rounded">
                      <Download className="h-3 w-3" />
                      <span className="truncate flex-1">{formData.download_url.split('/').pop()}</span>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Atau URL Download Manual</Label>
                  <Input
                    placeholder="https://example.com/app.apk"
                    value={formData.download_url}
                    onChange={(e) => setFormData({ ...formData, download_url: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Catatan Rilis</Label>
                  <Textarea
                    placeholder="Fitur baru, perbaikan bug, dll..."
                    value={formData.release_notes}
                    onChange={(e) => setFormData({ ...formData, release_notes: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Update Wajib</Label>
                    <p className="text-xs text-muted-foreground">Pengguna harus update untuk melanjutkan</p>
                  </div>
                  <Switch
                    checked={formData.is_force_update}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_force_update: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Aktif</Label>
                    <p className="text-xs text-muted-foreground">Versi ini tersedia untuk update</p>
                  </div>
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Batal
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Simpan
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {versions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Upload className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Belum ada versi aplikasi</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Versi</TableHead>
                  <TableHead>Platform</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {versions.map((version) => (
                  <TableRow key={version.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">v{version.version_name}</p>
                        <p className="text-xs text-muted-foreground">Kode: {version.version_code}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {version.platform === 'all' ? 'Semua' : version.platform}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge variant={version.is_active ? 'default' : 'secondary'}>
                          {version.is_active ? 'Aktif' : 'Nonaktif'}
                        </Badge>
                        {version.is_force_update && (
                          <Badge variant="destructive" className="text-xs">Wajib Update</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(version.created_at), 'dd MMM yyyy', { locale: id })}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(version)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(version.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
