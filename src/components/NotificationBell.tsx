import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { usePushNotification } from '@/hooks/usePushNotification';
import { useNotificationBadge } from '@/hooks/useNotificationBadge';
import { sendAnnouncementNotification } from '@/lib/pushNotification';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: string | null;
  created_at: string;
}

export default function NotificationBell() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const { permission, isSubscribed } = usePushNotification();
  const { updateBadge } = useNotificationBadge();

  useEffect(() => {
    // Load read announcement IDs from localStorage
    const stored = localStorage.getItem('readAnnouncements');
    if (stored) {
      setReadIds(new Set(JSON.parse(stored)));
    }
    
    loadAnnouncements();
    const cleanup = setupRealtimeSubscription();
    
    return cleanup;
  }, []);

  useEffect(() => {
    // Calculate unread count and update app badge
    const unread = announcements.filter(a => !readIds.has(a.id)).length;
    setUnreadCount(unread);
    
    // Update app icon badge
    updateBadge(unread);
  }, [announcements, readIds, updateBadge]);

  const loadAnnouncements = async () => {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setAnnouncements(data || []);
    } catch (error: unknown) {
      console.error('Error loading announcements:', error);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('announcements-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'announcements',
        },
        async (payload) => {
          console.log('New announcement:', payload);
          const newAnnouncement = payload.new as Announcement;
          
          setAnnouncements(prev => [newAnnouncement, ...prev.slice(0, 9)]);
          
          // Show toast notification
          toast({
            title: '📢 Pengumuman Baru',
            description: newAnnouncement.title,
          });

          // Send push notification to all subscribed users
          // This is triggered when a new announcement is created
          try {
            await sendAnnouncementNotification(
              newAnnouncement.title,
              newAnnouncement.content,
              newAnnouncement.priority || undefined
            );
          } catch (error) {
            console.error('Failed to send push notification for announcement:', error);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'announcements',
        },
        (payload) => {
          const updated = payload.new as Announcement;
          setAnnouncements(prev => 
            prev.map(a => a.id === updated.id ? updated : a)
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'announcements',
        },
        (payload) => {
          const deleted = payload.old as { id: string };
          setAnnouncements(prev => 
            prev.filter(a => a.id !== deleted.id)
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const markAsRead = (id: string) => {
    const newReadIds = new Set(readIds);
    newReadIds.add(id);
    setReadIds(newReadIds);
    localStorage.setItem('readAnnouncements', JSON.stringify([...newReadIds]));
  };

  const markAllAsRead = () => {
    const allIds = new Set(announcements.map(a => a.id));
    setReadIds(allIds);
    localStorage.setItem('readAnnouncements', JSON.stringify([...allIds]));
  };

  const getPriorityColor = (priority: string | null) => {
    switch (priority) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      default: return 'bg-blue-500';
    }
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'd MMM yyyy, HH:mm', { locale: id });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground flex items-center justify-center notification-badge">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-3 border-b">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-sm">Notifikasi</h4>
            {permission === 'granted' && isSubscribed && (
              <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">
                Push aktif
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs h-7"
              onClick={markAllAsRead}
            >
              Tandai semua dibaca
            </Button>
          )}
        </div>
        <ScrollArea className="h-[300px]">
          {announcements.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              Tidak ada notifikasi
            </div>
          ) : (
            <div className="divide-y">
              {announcements.map((announcement) => {
                const isUnread = !readIds.has(announcement.id);
                return (
                  <div
                    key={announcement.id}
                    className={`p-3 cursor-pointer hover:bg-muted/50 transition-colors ${
                      isUnread ? 'bg-primary/5' : ''
                    }`}
                    onClick={() => markAsRead(announcement.id)}
                  >
                    <div className="flex items-start gap-2">
                      <div className={`w-2 h-2 rounded-full mt-1.5 ${getPriorityColor(announcement.priority)}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`text-sm truncate ${isUnread ? 'font-semibold' : 'font-medium'}`}>
                            {announcement.title}
                          </p>
                          {isUnread && (
                            <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                          {announcement.content}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {formatDate(announcement.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
