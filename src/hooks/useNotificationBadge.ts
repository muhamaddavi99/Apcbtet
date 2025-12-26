import { useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';

/**
 * Hook to manage app icon badge count
 * Uses native badge API on iOS/Android via Capacitor
 */
export function useNotificationBadge() {
  const isNative = Capacitor.isNativePlatform();

  const updateBadge = useCallback(async (count: number) => {
    if (!isNative) {
      // Web fallback - update document title
      if (count > 0) {
        document.title = `(${count}) MA Al-Ittifaqiah`;
      } else {
        document.title = 'MA Al-Ittifaqiah';
      }
      return;
    }

    try {
      // For native, we'll use the badge API if available
      // Note: This requires @capawesome/capacitor-badge plugin for full badge support
      // For now, we'll use a simple approach that works with push notifications
      if ('setAppBadge' in navigator) {
        if (count > 0) {
          await (navigator as any).setAppBadge(count);
        } else {
          await (navigator as any).clearAppBadge();
        }
      }
    } catch (error) {
      console.log('Badge update not supported:', error);
    }
  }, [isNative]);

  const clearBadge = useCallback(async () => {
    await updateBadge(0);
  }, [updateBadge]);

  return {
    updateBadge,
    clearBadge,
  };
}
