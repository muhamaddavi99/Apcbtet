import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { FileText, Clock, CheckCircle, XCircle, Loader2, Calendar, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface LeaveRequest {
  id: string;
  request_type: string;
  reason: string;
  start_date: string;
  end_date: string;
  status: string;
  rejection_reason: string | null;
  created_at: string;
  approved_at: string | null;
  approver?: { full_name: string } | null;
}

export default function TeacherLeaveStatusWidget({ userId }: { userId: string }) {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);

  useEffect(() => {
    loadLeaveRequests();
    
    // Setup realtime subscription
    const channel = supabase
      .channel('teacher-leave-status')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'teacher_leave_requests',
          filter: `teacher_id=eq.${userId}`,
        },
        () => {
          loadLeaveRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const loadLeaveRequests = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('teacher_leave_requests')
        .select('*')
        .eq('teacher_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;

      // Fetch approver names
      const approverIds = [...new Set((data || []).filter(r => r.approved_by).map(r => r.approved_by!))];
      let approverMap = new Map();
      
      if (approverIds.length > 0) {
        const { data: approverProfiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', approverIds);
        approverMap = new Map(approverProfiles?.map(p => [p.id, p]) || []);
      }

      const enrichedData = (data || []).map(r => ({
        ...r,
        approver: r.approved_by ? approverMap.get(r.approved_by) : null,
      }));

      setRequests(enrichedData);
    } catch (error) {
      console.error('Error loading leave requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <Badge className="bg-green-500 gap-1 text-xs">
            <CheckCircle className="h-3 w-3" />
            Disetujui
          </Badge>
        );
      case 'rejected':
        return (
          <Badge className="bg-red-500 gap-1 text-xs">
            <XCircle className="h-3 w-3" />
            Ditolak
          </Badge>
        );
      default:
        return (
          <Badge className="bg-yellow-500 gap-1 text-xs">
            <Clock className="h-3 w-3" />
            Menunggu
          </Badge>
        );
    }
  };

  const getTypeBadge = (type: string) => {
    return type === 'sakit' 
      ? <Badge variant="outline" className="border-blue-500 text-blue-600 text-xs">Sakit</Badge>
      : <Badge variant="outline" className="border-yellow-500 text-yellow-600 text-xs">Izin</Badge>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getPendingCount = () => {
    return requests.filter(r => r.status === 'pending').length;
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
            <FileText className="h-4 w-4 text-primary" />
            Status Perizinan
            {getPendingCount() > 0 && (
              <Badge variant="secondary" className="ml-auto text-xs bg-yellow-500">
                {getPendingCount()} menunggu
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground text-sm">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Belum ada pengajuan perizinan</p>
            </div>
          ) : (
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {requests.map((request) => (
                  <div
                    key={request.id}
                    className="p-3 border rounded-lg hover:bg-accent/50 cursor-pointer transition-colors"
                    onClick={() => setSelectedRequest(request)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          {getTypeBadge(request.request_type)}
                          {getStatusBadge(request.status)}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                          <Calendar className="h-3 w-3" />
                          <span>
                            {formatDate(request.start_date)}
                            {request.start_date !== request.end_date && (
                              <> - {formatDate(request.end_date)}</>
                            )}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                          {request.reason}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Detail Perizinan
            </DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                {getTypeBadge(selectedRequest.request_type)}
                {getStatusBadge(selectedRequest.status)}
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {formatDate(selectedRequest.start_date)}
                    {selectedRequest.start_date !== selectedRequest.end_date && (
                      <> - {formatDate(selectedRequest.end_date)}</>
                    )}
                  </span>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium mb-1">Alasan:</p>
                <p className="text-sm text-muted-foreground">{selectedRequest.reason}</p>
              </div>

              {selectedRequest.status === 'approved' && selectedRequest.approver && (
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg border border-green-300 dark:border-green-700">
                  <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                    <CheckCircle className="h-4 w-4" />
                    <p className="text-sm font-medium">Disetujui oleh: {selectedRequest.approver.full_name}</p>
                  </div>
                  {selectedRequest.approved_at && (
                    <p className="text-xs text-green-600 dark:text-green-500 mt-1">
                      {formatDate(selectedRequest.approved_at)}
                    </p>
                  )}
                </div>
              )}

              {selectedRequest.status === 'rejected' && (
                <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg border border-red-300 dark:border-red-700">
                  <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                    <XCircle className="h-4 w-4" />
                    <p className="text-sm font-medium">Perizinan Ditolak</p>
                  </div>
                  {selectedRequest.rejection_reason && (
                    <p className="text-sm text-red-600 dark:text-red-500 mt-1">
                      Alasan: {selectedRequest.rejection_reason}
                    </p>
                  )}
                </div>
              )}

              {selectedRequest.status === 'pending' && (
                <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg border border-yellow-300 dark:border-yellow-700">
                  <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
                    <AlertCircle className="h-4 w-4" />
                    <p className="text-sm font-medium">Menunggu persetujuan</p>
                  </div>
                  <p className="text-xs text-yellow-600 dark:text-yellow-500 mt-1">
                    Pengajuan Anda sedang diproses oleh staff/admin.
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
