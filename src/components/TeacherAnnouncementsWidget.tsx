import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { Bell, Megaphone, Loader2, ChevronRight, ImageIcon, ExternalLink } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: string | null;
  image_url: string | null;
  created_at: string | null;
}

export default function TeacherAnnouncementsWidget() {
  const navigate = useNavigate();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);

  useEffect(() => {
    loadAnnouncements();
    
    // Setup realtime subscription
    const channel = supabase
      .channel('teacher-announcements')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'announcements',
        },
        () => {
          loadAnnouncements();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadAnnouncements = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setAnnouncements(data || []);
    } catch (error) {
      console.error('Error loading announcements:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityBadge = (priority: string | null) => {
    switch (priority) {
      case 'high':
        return <Badge className="bg-red-500 text-xs">Penting</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-500 text-xs">Sedang</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">Normal</Badge>;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <Card className="animate-fade-up">
        <CardContent className="py-6 flex justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="animate-fade-up">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Megaphone className="h-4 w-4 text-primary" />
            Pengumuman Terbaru
            {announcements.length > 0 && (
              <Badge variant="secondary" className="ml-auto text-xs">
                {announcements.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {announcements.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground text-sm">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Belum ada pengumuman</p>
            </div>
          ) : (
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {announcements.map((announcement) => (
                  <div
                    key={announcement.id}
                    className="p-3 border rounded-lg hover:bg-accent/50 cursor-pointer transition-colors"
                    onClick={() => setSelectedAnnouncement(announcement)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {getPriorityBadge(announcement.priority)}
                          {announcement.image_url && (
                            <ImageIcon className="h-3 w-3 text-muted-foreground" />
                          )}
                        </div>
                        <h4 className="font-medium text-sm truncate">{announcement.title}</h4>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {announcement.content}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDate(announcement.created_at)}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
          
          {/* View All Button */}
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full gap-2 mt-2"
            onClick={() => navigate('/riwayat-pengumuman')}
          >
            <ExternalLink className="h-4 w-4" />
            Lihat Semua Pengumuman
          </Button>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedAnnouncement} onOpenChange={() => setSelectedAnnouncement(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-primary" />
              {selectedAnnouncement?.title}
            </DialogTitle>
          </DialogHeader>
          {selectedAnnouncement && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                {getPriorityBadge(selectedAnnouncement.priority)}
                <span className="text-sm text-muted-foreground">
                  {formatDate(selectedAnnouncement.created_at)}
                </span>
              </div>
              {selectedAnnouncement.image_url && (
                <img
                  src={selectedAnnouncement.image_url}
                  alt="Announcement"
                  className="w-full rounded-lg object-cover max-h-[300px]"
                />
              )}
              <p className="text-sm whitespace-pre-wrap">{selectedAnnouncement.content}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
