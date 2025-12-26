import { Clock, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface TimeoutErrorOverlayProps {
  onRetry: () => void;
  message?: string;
  isVisible: boolean;
}

export function TimeoutErrorOverlay({ onRetry, message, isVisible }: TimeoutErrorOverlayProps) {
  const navigate = useNavigate();

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[9998] bg-background/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 animate-fade-in">
      <div className="max-w-sm w-full text-center space-y-6">
        <div className="mx-auto w-20 h-20 rounded-full bg-yellow-500/10 flex items-center justify-center">
          <Clock className="h-10 w-10 text-yellow-600" />
        </div>
        
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-foreground">Koneksi Timeout</h2>
          <p className="text-muted-foreground">
            {message || 'Server tidak merespons dalam waktu yang ditentukan. Silakan coba lagi.'}
          </p>
        </div>

        <div className="space-y-3">
          <Button 
            onClick={onRetry} 
            className="w-full gap-2"
            size="lg"
          >
            <RefreshCw className="h-4 w-4" />
            Coba Lagi
          </Button>
          
          <Button 
            variant="outline"
            onClick={() => navigate('/')} 
            className="w-full gap-2"
            size="lg"
          >
            <Home className="h-4 w-4" />
            Kembali ke Beranda
          </Button>
        </div>
      </div>
    </div>
  );
}
