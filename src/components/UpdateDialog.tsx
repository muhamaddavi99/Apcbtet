import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Download, RefreshCw } from 'lucide-react';

interface UpdateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  versionName: string;
  releaseNotes?: string | null;
  downloadUrl?: string | null;
  isForceUpdate?: boolean;
}

export function UpdateDialog({
  open,
  onOpenChange,
  versionName,
  releaseNotes,
  downloadUrl,
  isForceUpdate = false,
}: UpdateDialogProps) {
  const handleUpdate = () => {
    if (downloadUrl) {
      window.open(downloadUrl, '_blank');
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={isForceUpdate ? undefined : onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-primary" />
            Update Tersedia v{versionName}
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            {isForceUpdate && (
              <p className="text-destructive font-medium">
                Update ini wajib untuk melanjutkan penggunaan aplikasi.
              </p>
            )}
            {releaseNotes && (
              <div className="mt-2 p-3 bg-muted rounded-lg text-sm">
                <p className="font-medium mb-1">Catatan Rilis:</p>
                <p className="whitespace-pre-wrap">{releaseNotes}</p>
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          {!isForceUpdate && (
            <AlertDialogCancel>Nanti Saja</AlertDialogCancel>
          )}
          <AlertDialogAction onClick={handleUpdate} className="gap-2">
            <Download className="h-4 w-4" />
            Update Sekarang
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
