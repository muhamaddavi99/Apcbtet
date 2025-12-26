import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ServerCrash } from "lucide-react";
import { usePageTitle } from '@/hooks/usePageTitle';

const ServerError = () => {
  const location = useLocation();

  usePageTitle('Kesalahan Server');

  useEffect(() => {
    console.error("505 Error: Server error occurred at:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-6 p-8 animate-fade-up">
        <div className="animate-bounce-in">
          <ServerCrash className="h-24 w-24 text-destructive mx-auto mb-4" />
        </div>
        <h1 className="text-6xl font-bold text-foreground">505</h1>
        <h2 className="text-2xl font-semibold text-foreground">Kesalahan Server</h2>
        <p className="text-lg text-muted-foreground max-w-md mx-auto">
          Server tidak mendukung versi protokol HTTP yang digunakan dalam permintaan.
        </p>
        <Button asChild className="mt-4">
          <a href="/">Kembali ke Beranda</a>
        </Button>
      </div>
    </div>
  );
};

export default ServerError;
