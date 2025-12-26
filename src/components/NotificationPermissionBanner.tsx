import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Bell, X, Check, Smartphone } from 'lucide-react';
import { usePushNotification } from '@/hooks/usePushNotification';
import { useToast } from '@/hooks/use-toast';

export function NotificationPermissionBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { 
    isSupported, 
    isNative,
    permission, 
    isSubscribed,
    requestPermission, 
    subscribeToPush 
  } = usePushNotification();
  const { toast } = useToast();

  useEffect(() => {
    // Show banner if notifications are supported but not yet granted or subscribed
    // Always show banner if not subscribed, regardless of previous dismissal
    if (isSupported && permission !== 'denied') {
      if (!isSubscribed) {
        setShowBanner(true);
      } else {
        setShowBanner(false);
      }
    }
  }, [isSupported, permission, isSubscribed]);

  const handleEnable = async () => {
    setIsLoading(true);
    try {
      // First request permission if not granted
      if (permission !== 'granted') {
        const granted = await requestPermission();
        if (!granted) {
          toast({
            title: 'Izin Ditolak',
            description: isNative 
              ? 'Anda tidak akan menerima notifikasi. Ubah di pengaturan perangkat.'
              : 'Anda tidak akan menerima notifikasi. Anda dapat mengubahnya di pengaturan browser.',
            variant: 'destructive',
          });
          setIsLoading(false);
          return;
        }
      }

      // Then subscribe to push
      const subscription = await subscribeToPush();
      if (subscription) {
        toast({
          title: 'Notifikasi Diaktifkan',
          description: isNative
            ? 'Anda akan menerima notifikasi langsung di perangkat Anda.'
            : 'Anda akan menerima notifikasi jadwal mengajar setiap jam 4 pagi.',
        });
        setShowBanner(false);
      } else {
        toast({
          title: 'Gagal Berlangganan',
          description: 'Tidak dapat mengaktifkan notifikasi push. Silakan coba lagi.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error enabling notifications:', error);
      toast({
        title: 'Error',
        description: 'Terjadi kesalahan saat mengaktifkan notifikasi.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('notification-banner-dismissed', 'true');
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <Card className="mb-4 border-primary/20 bg-primary/5">
      <CardContent className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-primary/10">
            {isNative ? (
              <Smartphone className="h-5 w-5 text-primary" />
            ) : (
              <Bell className="h-5 w-5 text-primary" />
            )}
          </div>
          <div>
            <p className="font-medium text-sm">Aktifkan Notifikasi Push</p>
            <p className="text-xs text-muted-foreground">
              {isNative 
                ? 'Dapatkan notifikasi langsung di HP Anda'
                : 'Dapatkan pengingat jadwal mengajar setiap jam 4 pagi'
              }
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={handleEnable} disabled={isLoading}>
            {isLoading ? (
              'Mengaktifkan...'
            ) : (
              <>
                <Check className="h-4 w-4 mr-1" />
                Aktifkan
              </>
            )}
          </Button>
          <Button size="sm" variant="ghost" onClick={handleDismiss}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
