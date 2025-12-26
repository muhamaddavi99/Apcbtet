import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { usePageTitle } from '@/hooks/usePageTitle';
import { sendLeaveRequestNotification } from '@/lib/pushNotification';
import { 
  FileText, 
  Plus, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Loader2,
  Calendar,
  User,
  AlertCircle
} from 'lucide-react';

interface LeaveRequest {
  id: string;
  teacher_id: string;
  request_type: string;
  reason: string;
  start_date: string;
  end_date: string;
  status: string;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  profiles?: { full_name: string; nip: string };
  approver?: { full_name: string } | null;
}

export default function PerizinanGuru() {
  usePageTitle('Perizinan Guru');
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [userProfile, setUserProfile] = useState<any>(null);
  const [formData, setFormData] = useState({
    request_type: 'izin',
    reason: '',
    start_date: '',
    end_date: '',
  });
  const { toast } = useToast();

  useEffect(() => {
    loadUserProfile();
  }, []);

  useEffect(() => {
    if (userProfile) {
      loadRequests();
    }
  }, [userProfile]);

  const loadUserProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      setUserProfile(data);
    }
  };

  const loadRequests = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('teacher_leave_requests')
        .select(`
          *
        `)
        .order('created_at', { ascending: false });

      // Teachers only see their own requests
      if (userProfile?.role === 'teacher') {
        query = query.eq('teacher_id', userProfile.id);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch profiles separately
      const teacherIds = [...new Set((data || []).map(r => r.teacher_id))];
      const approverIds = [...new Set((data || []).filter(r => r.approved_by).map(r => r.approved_by!))];
      
      const { data: teacherProfiles } = await supabase
        .from('profiles')
        .select('id, full_name, nip')
        .in('id', teacherIds);
      
      const { data: approverProfiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', approverIds);

      const teacherMap = new Map(teacherProfiles?.map(p => [p.id, p]) || []);
      const approverMap = new Map(approverProfiles?.map(p => [p.id, p]) || []);

      const enrichedData = (data || []).map(r => ({
        ...r,
        profiles: teacherMap.get(r.teacher_id),
        approver: r.approved_by ? approverMap.get(r.approved_by) : null,
      }));

      setRequests(enrichedData);
    } catch (error: any) {
      console.error('Error loading requests:', error);
      toast({
        title: 'Error',
        description: 'Gagal memuat data perizinan',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.reason || !formData.start_date || !formData.end_date) {
      toast({
        title: 'Error',
        description: 'Semua field harus diisi',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('teacher_leave_requests')
        .insert({
          teacher_id: userProfile.id,
          request_type: formData.request_type,
          reason: formData.reason,
          start_date: formData.start_date,
          end_date: formData.end_date,
        });

      if (error) throw error;

      toast({
        title: 'Berhasil',
        description: 'Pengajuan perizinan berhasil dikirim',
      });

      setDialogOpen(false);
      setFormData({ request_type: 'izin', reason: '', start_date: '', end_date: '' });
      loadRequests();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Gagal mengirim pengajuan',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproval = async (approved: boolean) => {
    if (!selectedRequest) return;

    setSubmitting(true);
    try {
      const updateData: any = {
        status: approved ? 'approved' : 'rejected',
        approved_by: userProfile.id,
        approved_at: new Date().toISOString(),
      };

      if (!approved && rejectionReason) {
        updateData.rejection_reason = rejectionReason;
      }

      const { error } = await supabase
        .from('teacher_leave_requests')
        .update(updateData)
        .eq('id', selectedRequest.id);

      if (error) throw error;

      // If approved, update attendance for the date range (skip Fridays and holidays)
      if (approved) {
        const startDate = new Date(selectedRequest.start_date);
        const endDate = new Date(selectedRequest.end_date);
        
        // Fetch holidays in the date range
        const { data: holidays } = await supabase
          .from('holidays')
          .select('date')
          .gte('date', selectedRequest.start_date)
          .lte('date', selectedRequest.end_date);
        
        const holidayDates = new Set(holidays?.map(h => h.date) || []);
        
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
          const dateStr = d.toISOString().split('T')[0];
          
          // Skip Fridays (day 5 in JavaScript, 0=Sunday)
          if (d.getDay() === 5) continue;
          
          // Skip holidays
          if (holidayDates.has(dateStr)) continue;
          
          // Update or insert attendance record
          await supabase
            .from('attendance')
            .upsert({
              user_id: selectedRequest.teacher_id,
              date: dateStr,
              status: selectedRequest.request_type,
              type: 'permission',
            }, {
              onConflict: 'user_id,date',
              ignoreDuplicates: false,
            });
        }

        // Update teacher's can_teach status to false during leave period
        await supabase
          .from('profiles')
          .update({ can_teach: false })
          .eq('id', selectedRequest.teacher_id);
      }

      // Send push notification to the teacher
      try {
        await sendLeaveRequestNotification(
          selectedRequest.teacher_id,
          approved ? 'approved' : 'rejected',
          selectedRequest.request_type === 'sakit' ? 'Sakit' : 'Izin'
        );
      } catch (notifError) {
        console.error('Failed to send push notification:', notifError);
      }

      toast({
        title: 'Berhasil',
        description: approved ? 'Perizinan disetujui. Jadwal mengajar guru dihentikan selama periode izin/sakit.' : 'Perizinan ditolak',
      });

      setApprovalDialogOpen(false);
      setSelectedRequest(null);
      setRejectionReason('');
      loadRequests();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Gagal memproses perizinan',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Disetujui</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500"><XCircle className="h-3 w-3 mr-1" />Ditolak</Badge>;
      default:
        return <Badge className="bg-yellow-500"><Clock className="h-3 w-3 mr-1" />Menunggu</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    return type === 'sakit' 
      ? <Badge variant="outline" className="border-blue-500 text-blue-600">Sakit</Badge>
      : <Badge variant="outline" className="border-yellow-500 text-yellow-600">Izin</Badge>;
  };

  const isStaffOrAdmin = userProfile?.role === 'admin' || userProfile?.role === 'staff';

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-primary shrink-0" />
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold truncate">Perizinan Guru</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {isStaffOrAdmin ? 'Kelola pengajuan izin dan sakit guru' : 'Ajukan izin atau sakit'}
              </p>
            </div>
          </div>

          {userProfile?.role === 'teacher' && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-1 sm:gap-2 self-start sm:self-auto" size="sm">
                  <Plus className="h-4 w-4" />
                  <span className="text-xs sm:text-sm">Ajukan Perizinan</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-base sm:text-lg">Pengajuan Perizinan</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 sm:space-y-4 py-2 sm:py-4">
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label className="text-xs sm:text-sm">Jenis Perizinan</Label>
                    <Select
                      value={formData.request_type}
                      onValueChange={(v) => setFormData({ ...formData, request_type: v })}
                    >
                      <SelectTrigger className="text-xs sm:text-sm h-8 sm:h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="izin">Izin</SelectItem>
                        <SelectItem value="sakit">Sakit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:gap-4">
                    <div className="space-y-1.5 sm:space-y-2">
                      <Label className="text-xs sm:text-sm">Tanggal Mulai</Label>
                      <Input
                        type="date"
                        value={formData.start_date}
                        onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                        className="text-xs sm:text-sm h-8 sm:h-10"
                      />
                    </div>
                    <div className="space-y-1.5 sm:space-y-2">
                      <Label className="text-xs sm:text-sm">Tanggal Selesai</Label>
                      <Input
                        type="date"
                        value={formData.end_date}
                        onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                        className="text-xs sm:text-sm h-8 sm:h-10"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label className="text-xs sm:text-sm">Alasan</Label>
                    <Textarea
                      placeholder="Jelaskan alasan perizinan..."
                      value={formData.reason}
                      onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                      rows={3}
                      className="text-xs sm:text-sm"
                    />
                  </div>
                  <Button onClick={handleSubmit} disabled={submitting} className="w-full text-xs sm:text-sm" size="sm">
                    {submitting && <Loader2 className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" />}
                    Kirim Pengajuan
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Stats Cards for Staff/Admin */}
        {isStaffOrAdmin && (
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            <Card className="border-l-4 border-l-yellow-500">
              <CardContent className="pt-3 sm:pt-6 px-3 sm:px-6 pb-3 sm:pb-6">
                <div className="flex items-center gap-2 sm:gap-4">
                  <div className="p-2 sm:p-3 bg-yellow-500/10 rounded-lg">
                    <Clock className="h-4 w-4 sm:h-6 sm:w-6 text-yellow-500" />
                  </div>
                  <div>
                    <p className="text-[10px] sm:text-sm text-muted-foreground">Menunggu</p>
                    <p className="text-lg sm:text-2xl font-bold">{requests.filter(r => r.status === 'pending').length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-green-500">
              <CardContent className="pt-3 sm:pt-6 px-3 sm:px-6 pb-3 sm:pb-6">
                <div className="flex items-center gap-2 sm:gap-4">
                  <div className="p-2 sm:p-3 bg-green-500/10 rounded-lg">
                    <CheckCircle className="h-4 w-4 sm:h-6 sm:w-6 text-green-500" />
                  </div>
                  <div>
                    <p className="text-[10px] sm:text-sm text-muted-foreground">Disetujui</p>
                    <p className="text-lg sm:text-2xl font-bold">{requests.filter(r => r.status === 'approved').length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-red-500">
              <CardContent className="pt-3 sm:pt-6 px-3 sm:px-6 pb-3 sm:pb-6">
                <div className="flex items-center gap-2 sm:gap-4">
                  <div className="p-2 sm:p-3 bg-red-500/10 rounded-lg">
                    <XCircle className="h-4 w-4 sm:h-6 sm:w-6 text-red-500" />
                  </div>
                  <div>
                    <p className="text-[10px] sm:text-sm text-muted-foreground">Ditolak</p>
                    <p className="text-lg sm:text-2xl font-bold">{requests.filter(r => r.status === 'rejected').length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Requests Table */}
        <Card>
          <CardHeader>
            <CardTitle>Daftar Pengajuan Perizinan</CardTitle>
            <CardDescription>
              {isStaffOrAdmin ? 'Semua pengajuan perizinan guru' : 'Riwayat pengajuan Anda'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : requests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Belum ada pengajuan perizinan</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {isStaffOrAdmin && <TableHead>Guru</TableHead>}
                      <TableHead>Jenis</TableHead>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Alasan</TableHead>
                      <TableHead>Status</TableHead>
                      {isStaffOrAdmin && <TableHead>Aksi</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.map((request) => (
                      <TableRow key={request.id}>
                        {isStaffOrAdmin && (
                          <TableCell>
                            <div>
                              <p className="font-medium">{request.profiles?.full_name}</p>
                              <p className="text-sm text-muted-foreground">NIP: {request.profiles?.nip}</p>
                            </div>
                          </TableCell>
                        )}
                        <TableCell>{getTypeBadge(request.request_type)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">
                              {new Date(request.start_date).toLocaleDateString('id-ID')}
                              {request.start_date !== request.end_date && (
                                <> - {new Date(request.end_date).toLocaleDateString('id-ID')}</>
                              )}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">{request.reason}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {getStatusBadge(request.status)}
                            {request.status === 'approved' && request.approver && (
                              <p className="text-xs text-muted-foreground">
                                oleh {request.approver.full_name}
                              </p>
                            )}
                            {request.status === 'rejected' && request.rejection_reason && (
                              <p className="text-xs text-red-500">{request.rejection_reason}</p>
                            )}
                          </div>
                        </TableCell>
                        {isStaffOrAdmin && (
                          <TableCell>
                            {request.status === 'pending' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedRequest(request);
                                  setApprovalDialogOpen(true);
                                }}
                              >
                                Proses
                              </Button>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Approval Dialog */}
        <Dialog open={approvalDialogOpen} onOpenChange={setApprovalDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Proses Perizinan</DialogTitle>
            </DialogHeader>
            {selectedRequest && (
              <div className="space-y-4 py-4">
                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span className="font-medium">{selectedRequest.profiles?.full_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {getTypeBadge(selectedRequest.request_type)}
                    <span className="text-sm text-muted-foreground">
                      {new Date(selectedRequest.start_date).toLocaleDateString('id-ID')} - 
                      {new Date(selectedRequest.end_date).toLocaleDateString('id-ID')}
                    </span>
                  </div>
                  <p className="text-sm">{selectedRequest.reason}</p>
                </div>

                <div className="space-y-2">
                  <Label>Alasan Penolakan (opsional)</Label>
                  <Textarea
                    placeholder="Isi jika menolak pengajuan..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => handleApproval(false)}
                    disabled={submitting}
                    variant="destructive"
                    className="flex-1"
                  >
                    {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <XCircle className="h-4 w-4 mr-1" />
                    Tolak
                  </Button>
                  <Button
                    onClick={() => handleApproval(true)}
                    disabled={submitting}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Setujui
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
