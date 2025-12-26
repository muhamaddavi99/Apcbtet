import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.c103375c19cc45ac966261ffdfe95621',
  appName: 'MA Al-Ittifaqiah',
  webDir: 'dist',
  // Remove server.url for production - app will use bundled assets from dist/
  // Uncomment below for development with hot-reload:
  server: {
  url: '127.0.0.1',
  cleartext: true,
  allowNavigation: ['*']
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2500,
      launchAutoHide: false,
      launchFadeOutDuration: 500,
      backgroundColor: '#16a34a',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: true,
      spinnerStyle: 'large',
      spinnerColor: '#ffffff',
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#16a34a',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  ios: {
    contentInset: 'automatic',
    scrollEnabled: true,
  },
};

export default config;
