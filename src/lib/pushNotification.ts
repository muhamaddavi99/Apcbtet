import { supabase } from '@/integrations/supabase/client';

interface NotificationPayload {
  title: string;
  body: string;
  tag?: string;
  url?: string;
  icon?: string;
}

/**
 * Send push notification to specific users or all subscribed users
 * @param notification - The notification payload
 * @param userIds - Optional array of user IDs to send to. If not provided, sends to all.
 */
export async function sendPushNotification(
  notification: NotificationPayload,
  userIds?: string[]
): Promise<{ success: boolean; sent?: number; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('send-push-notification', {
      body: {
        notification,
        user_ids: userIds,
      },
    });

    if (error) {
      console.error('Error sending push notification:', error);
      return { success: false, error: error.message };
    }

    return { success: true, sent: data?.sent || 0 };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error calling push notification function:', error);
    return { success: false, error: errorMessage };
  }
}

/**
 * Send announcement notification to all users
 */
export async function sendAnnouncementNotification(
  title: string,
  content: string,
  priority?: string
): Promise<{ success: boolean; error?: string }> {
  const priorityEmoji = priority === 'high' ? '🚨' : priority === 'medium' ? '⚠️' : '📢';
  
  return sendPushNotification({
    title: `${priorityEmoji} ${title}`,
    body: content.length > 100 ? content.substring(0, 100) + '...' : content,
    tag: 'announcement',
    url: '/',
  });
}

/**
 * Send leave request status notification to a specific teacher
 */
export async function sendLeaveRequestNotification(
  teacherId: string,
  status: 'approved' | 'rejected',
  requestType: string
): Promise<{ success: boolean; error?: string }> {
  const statusEmoji = status === 'approved' ? '✅' : '❌';
  const statusText = status === 'approved' ? 'Disetujui' : 'Ditolak';
  
  return sendPushNotification(
    {
      title: `${statusEmoji} Perizinan ${statusText}`,
      body: `Pengajuan ${requestType} Anda telah ${statusText.toLowerCase()}.`,
      tag: 'leave-request',
      url: '/perizinan-guru',
    },
    [teacherId]
  );
}

/**
 * Send teaching reminder notification to a specific teacher
 */
export async function sendTeachingReminderNotification(
  teacherId: string,
  className: string,
  subjectName: string,
  startTime: string
): Promise<{ success: boolean; error?: string }> {
  return sendPushNotification(
    {
      title: '⏰ Pengingat Mengajar',
      body: `Jadwal mengajar ${subjectName} di kelas ${className} dimulai pukul ${startTime}`,
      tag: 'teaching-reminder',
      url: '/jadwal',
    },
    [teacherId]
  );
}
