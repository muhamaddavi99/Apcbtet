import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { App, URLOpenListenerEvent } from '@capacitor/app';

/**
 * Deep link handler for native app
 * Supports URLs like: 
 * - maittifaqiah://dashboard
 * - maittifaqiah://pengumuman
 * - maittifaqiah://jadwal
 * - https://app.maittifaqiah.com/dashboard
 */
export function useDeepLink() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const handleDeepLink = (event: URLOpenListenerEvent) => {
      console.log('Deep link received:', event.url);
      
      // Parse the URL
      const url = new URL(event.url);
      let path = '';
      
      // Handle custom scheme (maittifaqiah://path)
      if (url.protocol === 'maittifaqiah:') {
        path = url.hostname + url.pathname;
      } else {
        // Handle https://app.maittifaqiah.com/path
        path = url.pathname;
      }
      
      // Clean up path
      path = path.replace(/^\/+/, '/').replace(/\/+$/, '');
      if (!path.startsWith('/')) {
        path = '/' + path;
      }
      
      // Navigate to the path
      if (path && path !== '/') {
        console.log('Navigating to:', path);
        navigate(path);
      }
    };

    // Listen for deep link events
    App.addListener('appUrlOpen', handleDeepLink);

    // Check if app was opened via deep link
    App.getLaunchUrl().then((result) => {
      if (result?.url) {
        handleDeepLink({ url: result.url });
      }
    });

    return () => {
      App.removeAllListeners();
    };
  }, [navigate]);
}

/**
 * Parse notification data and extract deep link path
 */
export function parseNotificationDeepLink(data: any): string | null {
  if (!data) return null;
  
  // Check for url field
  if (data.url) {
    // If it's a full URL, extract the path
    if (data.url.startsWith('http') || data.url.startsWith('maittifaqiah://')) {
      try {
        const url = new URL(data.url);
        return url.pathname || '/';
      } catch {
        return data.url;
      }
    }
    return data.url;
  }
  
  // Check for path field
  if (data.path) {
    return data.path.startsWith('/') ? data.path : '/' + data.path;
  }
  
  return null;
}
