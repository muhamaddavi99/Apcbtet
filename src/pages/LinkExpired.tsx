import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, ArrowLeft, RefreshCw } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useSchoolSettings } from '@/contexts/SchoolContext';

export default function LinkExpired() {
  usePageTitle('Link Kadaluarsa');
  const { settings } = useSchoolSettings();
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-destructive/5 via-background to-destructive/10 p-4">
      <Card className="w-full max-w-md shadow-xl animate-scale-in">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center animate-bounce-in overflow-hidden">
            {settings.school_icon_url ? (
              <img src={settings.school_icon_url} alt="School Icon" className="w-full h-full object-cover" />
            ) : (
              <Clock className="h-10 w-10 text-destructive" />
            )}
          </div>
          <div className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <CardTitle className="text-2xl font-bold text-destructive">Link Kadaluarsa</CardTitle>
            <CardDescription className="mt-2">
              Link reset password sudah tidak berlaku
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 animate-fade-up" style={{ animationDelay: '0.3s' }}>
          <div className="text-center space-y-3">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-muted-foreground text-sm">
                Link reset password hanya berlaku selama <strong>1 jam</strong> setelah dikirim. 
                Silakan minta link baru untuk mereset password Anda.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <Link to="/forgot-password" className="block">
              <Button className="w-full gap-2 hover-scale">
                <RefreshCw className="h-4 w-4" />
                Minta Link Baru
              </Button>
            </Link>
            
            <Link to="/auth" className="block">
              <Button variant="outline" className="w-full gap-2 hover-scale">
                <ArrowLeft className="h-4 w-4" />
                Kembali ke Login
              </Button>
            </Link>
          </div>

          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              Jika Anda terus mengalami masalah, hubungi administrator sekolah.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
