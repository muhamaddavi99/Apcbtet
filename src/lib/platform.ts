import { Capacitor } from '@capacitor/core';

/**
 * Unique app fingerprint untuk membedakan native Android dan website
 * Browser type: kaakangsatir (custom identifier)
 */
const NATIVE_APP_FINGERPRINT = {
  browser: ['kaakangsatir'],
  version: [4, 7320, 1938472651],
};

/**
 * Cek fingerprint dari user agent untuk deteksi Android native
 */
function checkNativeFingerprint(): boolean {
  try {
    const userAgent = navigator.userAgent;
    
    // Check jika user agent mengandung fingerprint browser unik "kaakangsatir"
    const hasMatchingBrowser = NATIVE_APP_FINGERPRINT.browser.some(b => 
      userAgent.toLowerCase().includes(b.toLowerCase())
    );
    
    if (hasMatchingBrowser) {
      return true;
    }
    
    return false;
  } catch {
    return false;
  }
}

/**
 * State untuk menyimpan hasil deteksi platform (cached)
 */
let cachedIsNativeAndroid: boolean | null = null;

/**
 * Check if the app is running as Android native app
 * Menggunakan Capacitor detection
 */
export function isAndroidNativeApp(): boolean {
  if (cachedIsNativeAndroid !== null) {
    return cachedIsNativeAndroid;
  }
  
  cachedIsNativeAndroid = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
  return cachedIsNativeAndroid;
}

/**
 * Check if the app should show native Android UI
 * Ini yang digunakan untuk conditional rendering splash screen, update dialog, dll
 * HANYA true jika running di Capacitor native platform
 * Web browser TIDAK AKAN pernah return true
 */
export function shouldShowNativeUI(): boolean {
  // HANYA Capacitor native platform - tidak ada fingerprint check
  return Capacitor.isNativePlatform();
}

/**
 * Check if the app is running on a native platform (iOS/Android)
 */
export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Check if the app is running on web (NOT native)
 */
export function isWebPlatform(): boolean {
  return !Capacitor.isNativePlatform();
}

/**
 * Get the current platform
 */
export function getPlatform(): 'ios' | 'android' | 'web' {
  if (Capacitor.isNativePlatform()) {
    return Capacitor.getPlatform() as 'ios' | 'android' | 'web';
  }
  return 'web';
}

/**
 * Check if running on Android (native only)
 */
export function isAndroid(): boolean {
  return Capacitor.getPlatform() === 'android';
}

/**
 * Check if running on iOS
 */
export function isIOS(): boolean {
  return Capacitor.getPlatform() === 'ios';
}

/**
 * Current app version (for web)
 */
export const APP_VERSION = '1.0.0';
export const APP_VERSION_CODE = 1;

/**
 * Platform-specific styles
 */
export function getPlatformClass(): string {
  if (isAndroidNativeApp()) return 'platform-android-native';
  if (isAndroid()) return 'platform-android';
  if (isIOS()) return 'platform-ios';
  return 'platform-web';
}

/**
 * Get fingerprint info for debugging
 */
export function getFingerprint() {
  return {
    expected: NATIVE_APP_FINGERPRINT,
    actual: {
      userAgent: navigator.userAgent,
      isCapacitorNative: Capacitor.isNativePlatform(),
      platform: Capacitor.getPlatform(),
      hasFingerprint: checkNativeFingerprint(),
    },
    isNativeUI: shouldShowNativeUI(),
  };
}
