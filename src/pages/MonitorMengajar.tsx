import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { usePageTitle } from '@/hooks/usePageTitle';
import Layout from '@/components/Layout';
import { Users, Clock, BookOpen, Timer, Activity, Loader2, History, CheckCircle } from 'lucide-react';

interface ActiveSession {
  id: string;
  teacher_id: string;
  schedule_id: string;
  class_id: string;
  subject_id: string;
  start_time: string;
  end_time: string;
  status: string;
  created_at: string;
  teacher?: {
    full_name: string;
    avatar_url: string | null;
  };
  classes?: {
    name: string;
    grade: string;
  };
  subjects?: {
    name: string;
    code: string;
  };
}

export default function MonitorMengajar() {
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [completedSessions, setCompletedSessions] = useState<ActiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  usePageTitle('Monitor Mengajar');

  // Update current time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Load sessions
  useEffect(() => {
    loadActiveSessions();
    loadCompletedSessions();
  }, []);

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel('monitor-teaching-sessions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'teaching_sessions',
        },
        (payload) => {
          console.log('Session update:', payload);
          loadActiveSessions();
          loadCompletedSessions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadActiveSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('teaching_sessions')
        .select(`
          *,
          teacher:profiles!teaching_sessions_teacher_id_fkey(full_name, avatar_url),
          classes(name, grade),
          subjects(name, code)
        `)
        .eq('status', 'active')
        .order('start_time', { ascending: false });

      if (error) throw error;

      // Filter out expired sessions
      const now = new Date();
      const validSessions = (data || []).filter(session => {
        return new Date(session.end_time) > now;
      });

      // Mark expired sessions as completed
      const expiredSessions = (data || []).filter(session => {
        return new Date(session.end_time) <= now;
      });

      for (const session of expiredSessions) {
        await supabase
          .from('teaching_sessions')
          .update({ status: 'completed' })
          .eq('id', session.id);
      }

      setActiveSessions(validSessions);
    } catch (error) {
      console.error('Error loading sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCompletedSessions = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('teaching_sessions')
        .select(`
          *,
          teacher:profiles!teaching_sessions_teacher_id_fkey(full_name, avatar_url),
          classes(name, grade),
          subjects(name, code)
        `)
        .eq('status', 'completed')
        .gte('created_at', `${today}T00:00:00`)
        .order('end_time', { ascending: false })
        .limit(20);

      if (error) throw error;
      setCompletedSessions(data || []);
    } catch (error) {
      console.error('Error loading completed sessions:', error);
    }
  };

  const calculateRemainingTime = (endTime: string) => {
    const end = new Date(endTime);
    const diffMs = end.getTime() - currentTime.getTime();
    return Math.max(0, Math.floor(diffMs / 1000));
  };

  const calculateProgress = (startTime: string, endTime: string) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const total = end.getTime() - start.getTime();
    const elapsed = currentTime.getTime() - start.getTime();
    return Math.min(100, Math.max(0, (elapsed / total) * 100));
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Activity className="h-6 w-6 text-primary" />
              Monitor Kegiatan Mengajar
            </h1>
            <p className="text-muted-foreground">
              Pantau guru yang sedang mengajar secara realtime
            </p>
          </div>
          <Badge variant="outline" className="text-lg px-4 py-2">
            <Clock className="h-4 w-4 mr-2" />
            {currentTime.toLocaleTimeString('id-ID')}
          </Badge>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full">
                  <Users className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Guru Aktif Mengajar</p>
                  <p className="text-2xl font-bold">{activeSessions.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for Active and History */}
        <Tabs defaultValue="active" className="space-y-4">
          <TabsList>
            <TabsTrigger value="active" className="gap-2">
              <Activity className="h-4 w-4" />
              Sedang Mengajar ({activeSessions.length})
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="h-4 w-4" />
              Riwayat Hari Ini ({completedSessions.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active">
            {activeSessions.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <BookOpen className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium text-muted-foreground">
                    Tidak ada guru yang sedang mengajar saat ini
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Data akan muncul secara realtime ketika guru memulai sesi mengajar
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeSessions.map((session) => {
                  const remaining = calculateRemainingTime(session.end_time);
                  const progress = calculateProgress(session.start_time, session.end_time);
                  const isWarning = remaining <= 300;

                  return (
                    <Card 
                      key={session.id} 
                      className={`border-l-4 ${isWarning ? 'border-l-orange-500' : 'border-l-green-500'}`}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={session.teacher?.avatar_url || ''} />
                            <AvatarFallback className="bg-primary text-primary-foreground">
                              {session.teacher ? getInitials(session.teacher.full_name) : '??'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <CardTitle className="text-base">
                              {session.teacher?.full_name || 'Unknown Teacher'}
                            </CardTitle>
                            <Badge variant="secondary" className="mt-1">
                              {session.subjects?.name || 'Unknown Subject'}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <BookOpen className="h-4 w-4" />
                          <span>Kelas {session.classes?.name || 'Unknown'}</span>
                        </div>

                        <div className={`p-3 rounded-lg ${isWarning ? 'bg-orange-100 dark:bg-orange-900/30' : 'bg-primary/10'}`}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Timer className={`h-4 w-4 ${isWarning ? 'text-orange-600' : 'text-primary'}`} />
                              <span className="text-sm font-medium">Sisa Waktu</span>
                            </div>
                            <span className={`text-xl font-bold tabular-nums ${isWarning ? 'text-orange-600 animate-pulse' : 'text-primary'}`}>
                              {formatTime(remaining)}
                            </span>
                          </div>
                          <Progress value={100 - progress} className="h-2" />
                        </div>

                        <div className="text-xs text-muted-foreground text-center">
                          Mulai: {new Date(session.start_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                          {' — '}
                          Selesai: {new Date(session.end_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="history">
            {completedSessions.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <History className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium text-muted-foreground">
                    Belum ada riwayat mengajar hari ini
                  </h3>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {completedSessions.map((session) => (
                  <Card key={session.id} className="border-l-4 border-l-muted">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={session.teacher?.avatar_url || ''} />
                          <AvatarFallback className="bg-muted text-muted-foreground">
                            {session.teacher ? getInitials(session.teacher.full_name) : '??'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <CardTitle className="text-base">
                            {session.teacher?.full_name || 'Unknown Teacher'}
                          </CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary">
                              {session.subjects?.name || 'Unknown Subject'}
                            </Badge>
                            <Badge variant="outline" className="text-green-600 border-green-600">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Selesai
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <BookOpen className="h-4 w-4" />
                        <span>Kelas {session.classes?.name || 'Unknown'}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(session.start_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                        {' — '}
                        {new Date(session.end_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
