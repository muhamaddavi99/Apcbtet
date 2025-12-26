import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { WifiOff, RefreshCw, Wifi } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';

export function NetworkStatusOverlay() {
  const { isOnline, isChecking, refresh, connectionType } = useNetworkStatus();
  const [showReconnected, setShowReconnected] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true);
    } else if (wasOffline && isOnline) {
      setShowReconnected(true);
      const timer = setTimeout(() => {
        setShowReconnected(false);
        setWasOffline(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  // Show reconnected message
  if (showReconnected) {
    return (
      <div className="fixed top-0 left-0 right-0 z-[9999] bg-green-600 text-white py-2 px-4 flex items-center justify-center gap-2 animate-fade-in">
        <Wifi className="h-4 w-4" />
        <span className="text-sm font-medium">Koneksi internet tersambung kembali</span>
      </div>
    );
  }

  // Don't show anything if online
  if (isOnline || isChecking) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-background/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 animate-fade-in">
      <div className="max-w-sm w-full text-center space-y-6">
        <div className="mx-auto w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
          <WifiOff className="h-10 w-10 text-destructive" />
        </div>
        
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-foreground">Tidak Ada Koneksi Internet</h2>
          <p className="text-muted-foreground">
            Perangkat Anda tidak terhubung ke internet. Periksa koneksi WiFi atau data seluler Anda.
          </p>
        </div>

        <div className="space-y-3">
          <Button 
            onClick={refresh} 
            className="w-full gap-2"
            size="lg"
          >
            <RefreshCw className="h-4 w-4" />
            Coba Lagi
          </Button>
          
          <p className="text-xs text-muted-foreground">
            Tipe koneksi: {connectionType === 'none' ? 'Tidak ada' : connectionType}
          </p>
        </div>
      </div>
    </div>
  );
}
