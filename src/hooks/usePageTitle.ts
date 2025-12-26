import { useEffect } from 'react';

export function usePageTitle(title: string) {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = title ? `${title} | Sistem Informasi Sekolah` : 'Sistem Informasi Sekolah';
    
    return () => {
      document.title = previousTitle;
    };
  }, [title]);
}
