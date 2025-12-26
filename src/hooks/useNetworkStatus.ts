import { useState, useEffect, useCallback } from 'react';
import { Network, ConnectionStatus } from '@capacitor/network';
import { Capacitor } from '@capacitor/core';

export type NetworkState = {
  isOnline: boolean;
  connectionType: string;
  isChecking: boolean;
};

export function useNetworkStatus() {
  const [networkState, setNetworkState] = useState<NetworkState>({
    isOnline: navigator.onLine,
    connectionType: 'unknown',
    isChecking: true,
  });

  const checkNetworkStatus = useCallback(async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        const status = await Network.getStatus();
        setNetworkState({
          isOnline: status.connected,
          connectionType: status.connectionType,
          isChecking: false,
        });
      } else {
        // Web fallback
        setNetworkState({
          isOnline: navigator.onLine,
          connectionType: navigator.onLine ? 'wifi' : 'none',
          isChecking: false,
        });
      }
    } catch (error) {
      console.error('Error checking network status:', error);
      setNetworkState({
        isOnline: navigator.onLine,
        connectionType: 'unknown',
        isChecking: false,
      });
    }
  }, []);

  useEffect(() => {
    checkNetworkStatus();

    // Native platform listener
    let networkListener: any = null;
    
    if (Capacitor.isNativePlatform()) {
      Network.addListener('networkStatusChange', (status: ConnectionStatus) => {
        setNetworkState({
          isOnline: status.connected,
          connectionType: status.connectionType,
          isChecking: false,
        });
      }).then(listener => {
        networkListener = listener;
      });
    }

    // Web fallback listeners
    const handleOnline = () => {
      setNetworkState(prev => ({ ...prev, isOnline: true, connectionType: 'wifi' }));
    };

    const handleOffline = () => {
      setNetworkState(prev => ({ ...prev, isOnline: false, connectionType: 'none' }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (networkListener) {
        networkListener.remove();
      }
    };
  }, [checkNetworkStatus]);

  return { ...networkState, refresh: checkNetworkStatus };
}
