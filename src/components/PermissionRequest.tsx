import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Bell, Camera, MapPin, Shield } from 'lucide-react';

type PermissionType = 'notifications' | 'camera' | 'location';

interface PermissionConfig {
  icon: React.ReactNode;
  title: string;
  description: string;
  benefit: string;
}

const permissionConfigs: Record<PermissionType, PermissionConfig> = {
  notifications: {
    icon: <Bell className="h-8 w-8 text-primary" />,
    title: 'Izinkan Notifikasi',
    description: 'Aplikasi memerlukan izin untuk mengirim notifikasi kepada Anda.',
    benefit: 'Anda akan menerima pengingat absensi, jadwal mengajar, dan pengumuman penting.',
  },
  camera: {
    icon: <Camera className="h-8 w-8 text-primary" />,
    title: 'Izinkan Akses Kamera',
    description: 'Aplikasi memerlukan izin untuk mengakses kamera perangkat Anda.',
    benefit: 'Digunakan untuk scan QR code absensi dan mengambil foto profil.',
  },
  location: {
    icon: <MapPin className="h-8 w-8 text-primary" />,
    title: 'Izinkan Akses Lokasi',
    description: 'Aplikasi memerlukan izin untuk mengakses lokasi perangkat Anda.',
    benefit: 'Digunakan untuk verifikasi lokasi absensi di area sekolah.',
  },
};

interface PermissionRequestProps {
  type: PermissionType;
  isOpen: boolean;
  onClose: () => void;
  onAllow: () => Promise<void>;
  onDeny: () => void;
}

export function PermissionRequest({ 
  type, 
  isOpen, 
  onClose, 
  onAllow, 
  onDeny 
}: PermissionRequestProps) {
  const [isRequesting, setIsRequesting] = useState(false);
  const config = permissionConfigs[type];

  const handleAllow = async () => {
    setIsRequesting(true);
    try {
      await onAllow();
      onClose();
    } catch (error) {
      console.error('Permission request error:', error);
    } finally {
      setIsRequesting(false);
    }
  };

  const handleDeny = () => {
    onDeny();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            {config.icon}
          </div>
          <DialogTitle className="text-xl">{config.title}</DialogTitle>
          <DialogDescription className="text-center">
            {config.description}
          </DialogDescription>
        </DialogHeader>

        <div className="my-4 p-4 bg-muted rounded-lg">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">Mengapa ini diperlukan?</p>
              <p className="text-sm text-muted-foreground mt-1">{config.benefit}</p>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button 
            variant="outline" 
            onClick={handleDeny}
            className="w-full sm:w-auto"
          >
            Nanti Saja
          </Button>
          <Button 
            onClick={handleAllow}
            disabled={isRequesting}
            className="w-full sm:w-auto"
          >
            {isRequesting ? 'Meminta izin...' : 'Izinkan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Hook to manage permissions
export function usePermissions() {
  const [notificationPermission, setNotificationPermission] = useState<PermissionState>('prompt');

  useEffect(() => {
    // Check notification permission
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission as PermissionState);
    }
  }, []);

  const requestNotificationPermission = async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      console.warn('Notifications not supported');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission as PermissionState);
      return permission === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  };

  return {
    notificationPermission,
    requestNotificationPermission,
    isNativePlatform: Capacitor.isNativePlatform(),
  };
}
