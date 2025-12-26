import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { usePageTitle } from '@/hooks/usePageTitle';
import { Plus, Mail, Send, Edit, Trash2, Search, FileText } from 'lucide-react';

interface Letter {
  id: string;
  letter_number: string;
  letter_type: string;
  date: string;
  sender: string | null;
  recipient: string | null;
  subject: string;
  content: string | null;
  category: string | null;
  status: string | null;
  created_at: string;
}

const categories = [
  'Umum',
  'Kepegawaian',
  'Kesiswaan',
  'Kurikulum',
  'Keuangan',
  'Sarana Prasarana',
  'Lainnya',
];

const statuses = [
  { value: 'pending', label: 'Pending', color: 'bg-yellow-500/10 text-yellow-600' },
  { value: 'processed', label: 'Diproses', color: 'bg-blue-500/10 text-blue-600' },
  { value: 'completed', label: 'Selesai', color: 'bg-green-500/10 text-green-600' },
  { value: 'archived', label: 'Diarsipkan', color: 'bg-muted text-muted-foreground' },
];

export default function SuratMenyurat() {
  usePageTitle('Surat Menyurat');
  const [letters, setLetters] = useState<Letter[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentLetter, setCurrentLetter] = useState<Letter | null>(null);
  const [activeTab, setActiveTab] = useState<'masuk' | 'keluar'>('masuk');
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    letter_number: '',
    letter_type: 'masuk' as 'masuk' | 'keluar',
    date: new Date().toISOString().split('T')[0],
    sender: '',
    recipient: '',
    subject: '',
    content: '',
    category: '',
    status: 'pending',
  });
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    loadUser();
    loadLetters();
  }, []);

  const loadUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setUserId(user.id);
  };

  const loadLetters = async () => {
    try {
      const { data, error } = await supabase
        .from('letters')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;
      setLetters(data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Gagal memuat data surat',
        variant: 'destructive',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editMode && currentLetter) {
        const { error } = await supabase
          .from('letters')
          .update(formData)
          .eq('id', currentLetter.id);
        if (error) throw error;
        toast({ title: 'Berhasil', description: 'Surat berhasil diperbarui' });
      } else {
        const { error } = await supabase
          .from('letters')
          .insert({ ...formData, created_by: userId });
        if (error) throw error;
        toast({ title: 'Berhasil', description: 'Surat berhasil ditambahkan' });
      }
      loadLetters();
      handleDialogClose();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Gagal menyimpan surat',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (letter: Letter) => {
    setCurrentLetter(letter);
    setFormData({
      letter_number: letter.letter_number,
      letter_type: (letter.letter_type === 'masuk' || letter.letter_type === 'keluar') ? letter.letter_type : 'masuk',
      date: letter.date,
      sender: letter.sender || '',
      recipient: letter.recipient || '',
      subject: letter.subject,
      content: letter.content || '',
      category: letter.category || '',
      status: letter.status || 'pending',
    });
    setEditMode(true);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus surat ini?')) return;
    
    try {
      const { error } = await supabase.from('letters').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Berhasil', description: 'Surat berhasil dihapus' });
      loadLetters();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Gagal menghapus surat',
        variant: 'destructive',
      });
    }
  };

  const openAddDialog = (type: 'masuk' | 'keluar') => {
    setFormData({ ...formData, letter_type: type });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      letter_number: '',
      letter_type: 'masuk',
      date: new Date().toISOString().split('T')[0],
      sender: '',
      recipient: '',
      subject: '',
      content: '',
      category: '',
      status: 'pending',
    });
    setCurrentLetter(null);
    setEditMode(false);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    resetForm();
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = statuses.find(s => s.value === status);
    return statusConfig?.color || 'bg-muted text-muted-foreground';
  };

  const filteredLetters = letters
    .filter(letter => letter.letter_type === activeTab)
    .filter(letter => 
      letter.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      letter.letter_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (letter.sender && letter.sender.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (letter.recipient && letter.recipient.toLowerCase().includes(searchTerm.toLowerCase()))
    );

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Surat Menyurat</h1>
            <p className="text-muted-foreground">Kelola surat masuk dan surat keluar</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'masuk' | 'keluar')}>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <TabsList>
              <TabsTrigger value="masuk" className="gap-2">
                <Mail className="h-4 w-4" />
                Surat Masuk
              </TabsTrigger>
              <TabsTrigger value="keluar" className="gap-2">
                <Send className="h-4 w-4" />
                Surat Keluar
              </TabsTrigger>
            </TabsList>
            
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari surat..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-64"
                />
              </div>
              <Button onClick={() => openAddDialog(activeTab)}>
                <Plus className="mr-2 h-4 w-4" />
                Tambah Surat {activeTab === 'masuk' ? 'Masuk' : 'Keluar'}
              </Button>
            </div>
          </div>

          <TabsContent value="masuk" className="mt-4">
            <LettersTable 
              letters={filteredLetters} 
              onEdit={handleEdit} 
              onDelete={handleDelete}
              getStatusBadge={getStatusBadge}
              statuses={statuses}
            />
          </TabsContent>

          <TabsContent value="keluar" className="mt-4">
            <LettersTable 
              letters={filteredLetters} 
              onEdit={handleEdit} 
              onDelete={handleDelete}
              getStatusBadge={getStatusBadge}
              statuses={statuses}
            />
          </TabsContent>
        </Tabs>

        <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editMode ? 'Edit Surat' : `Tambah Surat ${formData.letter_type === 'masuk' ? 'Masuk' : 'Keluar'}`}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="letter_number">Nomor Surat</Label>
                  <Input
                    id="letter_number"
                    value={formData.letter_number}
                    onChange={(e) => setFormData({ ...formData, letter_number: e.target.value })}
                    placeholder="001/MA-AIT/XII/2024"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="date">Tanggal</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="sender">Pengirim</Label>
                  <Input
                    id="sender"
                    value={formData.sender}
                    onChange={(e) => setFormData({ ...formData, sender: e.target.value })}
                    placeholder="Nama pengirim"
                  />
                </div>
                <div>
                  <Label htmlFor="recipient">Penerima</Label>
                  <Input
                    id="recipient"
                    value={formData.recipient}
                    onChange={(e) => setFormData({ ...formData, recipient: e.target.value })}
                    placeholder="Nama penerima"
                  />
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category">Kategori</Label>
                  <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih kategori" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih status" />
                    </SelectTrigger>
                    <SelectContent>
                      {statuses.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="subject">Perihal</Label>
                <Input
                  id="subject"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="Perihal surat"
                  required
                />
              </div>
              <div>
                <Label htmlFor="content">Isi/Ringkasan Surat</Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Tuliskan ringkasan isi surat"
                  rows={4}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={handleDialogClose}>
                  Batal
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Menyimpan...' : 'Simpan'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}

function LettersTable({ 
  letters, 
  onEdit, 
  onDelete, 
  getStatusBadge,
  statuses 
}: { 
  letters: Letter[]; 
  onEdit: (letter: Letter) => void; 
  onDelete: (id: string) => void;
  getStatusBadge: (status: string) => string;
  statuses: { value: string; label: string; color: string }[];
}) {
  if (letters.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Belum ada data surat</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>No. Surat</TableHead>
              <TableHead>Tanggal</TableHead>
              <TableHead>Pengirim/Penerima</TableHead>
              <TableHead>Perihal</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {letters.map((letter) => (
              <TableRow key={letter.id}>
                <TableCell className="font-medium">{letter.letter_number}</TableCell>
                <TableCell>
                  {new Date(letter.date).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </TableCell>
                <TableCell>
                  {letter.letter_type === 'masuk' ? letter.sender : letter.recipient}
                </TableCell>
                <TableCell className="max-w-xs truncate">{letter.subject}</TableCell>
                <TableCell>
                  <Badge variant="outline">{letter.category || '-'}</Badge>
                </TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded-full text-xs ${getStatusBadge(letter.status)}`}>
                    {statuses.find(s => s.value === letter.status)?.label || letter.status}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="outline" onClick={() => onEdit(letter)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => onDelete(letter.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
