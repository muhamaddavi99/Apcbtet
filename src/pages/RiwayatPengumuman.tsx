import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { usePageTitle } from '@/hooks/usePageTitle';
import { 
  Megaphone, 
  Search, 
  Loader2, 
  Calendar, 
  ImageIcon,
  Filter,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: string | null;
  image_url: string | null;
  created_at: string | null;
  created_by: string;
  creator?: { full_name: string } | null;
}

export default function RiwayatPengumuman() {
  usePageTitle('Riwayat Pengumuman');
  
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 10;

  useEffect(() => {
    loadAnnouncements();
  }, [page, priorityFilter]);

  useEffect(() => {
    // Reset to first page when search changes
    setPage(1);
  }, [searchQuery]);

  const loadAnnouncements = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('announcements')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      if (priorityFilter !== 'all') {
        query = query.eq('priority', priorityFilter);
      }

      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,content.ilike.%${searchQuery}%`);
      }

      // Pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      // Fetch creator names
      const creatorIds = [...new Set((data || []).map(a => a.created_by))];
      let creatorMap = new Map();
      
      if (creatorIds.length > 0) {
        const { data: creatorProfiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', creatorIds);
        creatorMap = new Map(creatorProfiles?.map(p => [p.id, p]) || []);
      }

      const enrichedData = (data || []).map(a => ({
        ...a,
        creator: creatorMap.get(a.created_by) || null,
      }));

      setAnnouncements(enrichedData);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Error loading announcements:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    loadAnnouncements();
  };

  const getPriorityBadge = (priority: string | null) => {
    switch (priority) {
      case 'high':
        return <Badge className="bg-red-500">Penting</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-500">Sedang</Badge>;
      default:
        return <Badge variant="outline">Normal</Badge>;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Megaphone className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold text-foreground">Riwayat Pengumuman</h1>
            <p className="text-muted-foreground">Lihat semua pengumuman sekolah</p>
          </div>
        </div>

        {/* Search & Filter */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari pengumuman..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger className="w-[150px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Prioritas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua</SelectItem>
                    <SelectItem value="high">Penting</SelectItem>
                    <SelectItem value="medium">Sedang</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={handleSearch}>
                  <Search className="h-4 w-4 mr-2" />
                  Cari
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Daftar Pengumuman</span>
              <span className="text-sm font-normal text-muted-foreground">
                {totalCount} pengumuman ditemukan
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : announcements.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Megaphone className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">Tidak ada pengumuman</p>
                <p className="text-sm">Coba ubah filter atau kata kunci pencarian</p>
              </div>
            ) : (
              <div className="space-y-4">
                {announcements.map((announcement) => (
                  <div
                    key={announcement.id}
                    className="p-4 border rounded-lg hover:bg-accent/50 cursor-pointer transition-colors"
                    onClick={() => setSelectedAnnouncement(announcement)}
                  >
                    <div className="flex items-start gap-4">
                      {announcement.image_url && (
                        <img
                          src={announcement.image_url}
                          alt="Announcement"
                          className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          {getPriorityBadge(announcement.priority)}
                          {announcement.image_url && (
                            <Badge variant="outline" className="gap-1">
                              <ImageIcon className="h-3 w-3" />
                              Gambar
                            </Badge>
                          )}
                        </div>
                        <h3 className="font-semibold text-lg mb-1">{announcement.title}</h3>
                        <p className="text-muted-foreground line-clamp-2 mb-2">
                          {announcement.content}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {formatDate(announcement.created_at)}
                          </div>
                          {announcement.creator && (
                            <span>oleh {announcement.creator.full_name}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-4">
                    <Button
                      variant="outline"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Sebelumnya
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Halaman {page} dari {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    >
                      Selanjutnya
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedAnnouncement} onOpenChange={() => setSelectedAnnouncement(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Megaphone className="h-6 w-6 text-primary" />
              {selectedAnnouncement?.title}
            </DialogTitle>
          </DialogHeader>
          {selectedAnnouncement && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                {getPriorityBadge(selectedAnnouncement.priority)}
                <span className="text-sm text-muted-foreground">
                  {formatDate(selectedAnnouncement.created_at)}
                </span>
                {selectedAnnouncement.creator && (
                  <span className="text-sm text-muted-foreground">
                    oleh {selectedAnnouncement.creator.full_name}
                  </span>
                )}
              </div>
              
              {selectedAnnouncement.image_url && (
                <img
                  src={selectedAnnouncement.image_url}
                  alt="Announcement"
                  className="w-full rounded-lg object-cover max-h-[400px]"
                />
              )}
              
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <p className="whitespace-pre-wrap">{selectedAnnouncement.content}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
