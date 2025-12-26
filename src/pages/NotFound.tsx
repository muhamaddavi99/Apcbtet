import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { usePageTitle } from '@/hooks/usePageTitle';

const NotFound = () => {
  const location = useLocation();

  usePageTitle('Halaman Tidak Ditemukan');

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-6 p-8 animate-fade-up">
        <div className="animate-bounce-in">
          <h1 className="text-9xl font-bold text-primary mb-2">404</h1>
        </div>
        <h2 className="text-3xl font-semibold text-foreground">Halaman Tidak Ditemukan</h2>
        <p className="text-lg text-muted-foreground max-w-md mx-auto">
          Maaf, halaman yang Anda cari tidak dapat ditemukan atau telah dipindahkan.
        </p>
        <div className="pt-4">
          <a 
            href="/" 
            className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-primary-foreground font-medium hover:bg-primary/90 transition-all hover:scale-105"
          >
            Kembali ke Beranda
          </a>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
