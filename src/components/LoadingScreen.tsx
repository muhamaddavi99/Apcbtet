import { useSchoolSettings } from '@/contexts/SchoolContext';
import { GraduationCap } from 'lucide-react';

export default function LoadingScreen() {
  const { settings } = useSchoolSettings();

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-primary/10 via-background to-primary/20">
      {/* Animated Background Circles */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-primary/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '0.5s' }} />
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Logo Container with Animation */}
        <div className="relative mb-8">
          {/* Outer Ring */}
          <div className="absolute inset-0 w-32 h-32 rounded-full border-4 border-primary/20 animate-spin" style={{ animationDuration: '3s' }} />
          
          {/* Middle Ring */}
          <div className="absolute inset-2 w-28 h-28 rounded-full border-4 border-t-primary border-r-transparent border-b-transparent border-l-transparent animate-spin" style={{ animationDuration: '1.5s' }} />
          
          {/* Inner Circle with Logo */}
          <div className="relative w-32 h-32 flex items-center justify-center">
            <div className="w-24 h-24 bg-primary rounded-full flex items-center justify-center shadow-lg shadow-primary/30 animate-pulse">
              {settings.school_icon_url ? (
                <img 
                  src={settings.school_icon_url} 
                  alt="School Logo" 
                  className="h-16 w-16 rounded-full object-cover"
                />
              ) : (
                <GraduationCap className="h-12 w-12 text-primary-foreground" />
              )}
            </div>
          </div>
        </div>

        {/* School Name */}
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2 animate-fade-in">
          {settings.school_name}
        </h1>
        
        {/* Subtitle */}
        <p className="text-muted-foreground mb-8 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          Sistem Informasi Sekolah
        </p>

        {/* Loading Dots */}
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>

        {/* Loading Text */}
        <p className="mt-4 text-sm text-muted-foreground animate-pulse">
          Memuat...
        </p>
      </div>

      {/* Bottom Wave Animation */}
      <div className="absolute bottom-0 left-0 right-0 h-32 overflow-hidden">
        <svg 
          className="absolute bottom-0 w-full h-32 text-primary/10" 
          viewBox="0 0 1440 120" 
          preserveAspectRatio="none"
        >
          <path 
            d="M0,64 C320,120 420,20 720,64 C1020,108 1120,20 1440,64 L1440,120 L0,120 Z" 
            fill="currentColor"
            className="animate-pulse"
          />
        </svg>
        <svg 
          className="absolute bottom-0 w-full h-32 text-primary/5" 
          viewBox="0 0 1440 120" 
          preserveAspectRatio="none"
        >
          <path 
            d="M0,96 C320,40 420,120 720,96 C1020,72 1120,120 1440,96 L1440,120 L0,120 Z" 
            fill="currentColor"
            className="animate-pulse"
            style={{ animationDelay: '0.5s' }}
          />
        </svg>
      </div>
    </div>
  );
}
