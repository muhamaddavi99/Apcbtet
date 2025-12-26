import { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { supabase } from '@/integrations/supabase/client';
import { parseNotificationDeepLink } from './useDeepLink';

// VAPID public key for web push
const VAPID_PUBLIC_KEY = 'BFiN7_PrqFMJutXb57L8hYO7KifVj-UoI9V1vmZYziTW5bEXS3BAqSxLdqgEavRGATYbO7bT6AgzVFWB8sQUUPo';

interface NotificationData {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  url?: string;
  actions?: { action: string; title: string }[];
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotification() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const isNative = Capacitor.isNativePlatform();

  useEffect(() => {
    if (isNative) {
      // Native platform - use Capacitor Push Notifications
      initNativePush();
    } else {
      // Web platform - use Web Push API with Supabase
      initWebPush();
    }
  }, [isNative]);

  const initNativePush = async () => {
    setIsSupported(true);
    
    try {
      // Check current permission status
      const permStatus = await PushNotifications.checkPermissions();
      
      if (permStatus.receive === 'granted') {
        setPermission('granted');
        await registerNativePush();
      } else if (permStatus.receive === 'denied') {
        setPermission('denied');
      } else {
        setPermission('default');
      }

      // Add listeners
      await addNativeListeners();
    } catch (error) {
      console.error('Error initializing native push:', error);
    }
  };

  const initWebPush = async () => {
    const supported = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
    setIsSupported(supported);

    if (supported) {
      setPermission(Notification.permission);
      await registerServiceWorker();
    }
  };

  const addNativeListeners = async () => {
    // On registration success - save token to Supabase
    await PushNotifications.addListener('registration', async (token: Token) => {
      console.log('Native push registration token:', token.value);
      setFcmToken(token.value);
      setIsSubscribed(true);
      
      // Save token to Supabase database
      await saveNativeToken(token.value);
    });

    // On registration error
    await PushNotifications.addListener('registrationError', (error: any) => {
      console.error('Native push registration error:', error);
    });

    // On push notification received (app in foreground)
    await PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
      console.log('Push notification received:', notification);
      
      // Show local notification when in foreground
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(notification.title || 'Notifikasi', {
          body: notification.body || '',
          icon: '/app-icon.png',
        });
      }
    });

    // On push notification action performed (user tapped notification)
    await PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
      console.log('Push notification action performed:', action);
      
      // Navigate to specific page based on notification data
      const deepLink = parseNotificationDeepLink(action.notification.data);
      if (deepLink) {
        window.location.href = deepLink;
      }
    });
  };

  const saveNativeToken = async (token: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.warn('No user logged in');
        return;
      }

      // Save FCM/APNs token to Supabase database
      // We use a special format to distinguish native tokens
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: user.id,
          endpoint: `native://${Capacitor.getPlatform()}/${token}`,
          p256dh: token,
          auth: Capacitor.getPlatform(), // 'ios' or 'android'
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,endpoint',
        });

      if (error) {
        console.error('Error saving native token:', error);
      } else {
        console.log('Native push token saved to Supabase');
      }
    } catch (error) {
      console.error('Error saving native token:', error);
    }
  };

  const registerNativePush = async () => {
    try {
      await PushNotifications.register();
    } catch (error) {
      console.error('Error registering native push:', error);
    }
  };

  const registerServiceWorker = async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered:', reg);
      setRegistration(reg);
      
      const subscription = await reg.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
      
      return reg;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return null;
    }
  };

  const requestPermission = useCallback(async () => {
    if (!isSupported) {
      console.warn('Notifications not supported');
      return false;
    }

    try {
      if (isNative) {
        // Native permission request
        const permStatus = await PushNotifications.requestPermissions();
        
        if (permStatus.receive === 'granted') {
          setPermission('granted');
          await registerNativePush();
          return true;
        } else {
          setPermission('denied');
          return false;
        }
      } else {
        // Web permission request
        const result = await Notification.requestPermission();
        setPermission(result);
        return result === 'granted';
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }, [isSupported, isNative]);

  const subscribeToPush = useCallback(async () => {
    if (isNative) {
      // For native, registration is handled automatically
      await registerNativePush();
      return fcmToken;
    }

    if (!registration || permission !== 'granted') {
      console.warn('Cannot subscribe: registration or permission missing');
      return null;
    }

    try {
      const vapidKey = VAPID_PUBLIC_KEY;
      
      if (!vapidKey) {
        console.warn('VAPID public key not configured');
        return null;
      }

      const applicationServerKey = urlBase64ToUint8Array(vapidKey);
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey.buffer as ArrayBuffer,
      });

      console.log('Push subscription:', subscription);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.warn('No user logged in');
        return null;
      }

      const subscriptionJson = subscription.toJSON();
      const p256dh = subscriptionJson.keys?.p256dh || '';
      const auth = subscriptionJson.keys?.auth || '';

      // Save to Supabase
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: user.id,
          endpoint: subscription.endpoint,
          p256dh,
          auth,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,endpoint',
        });

      if (error) {
        console.error('Error saving subscription:', error);
        throw error;
      }

      setIsSubscribed(true);
      console.log('Web push subscription saved to Supabase');
      return subscription;
    } catch (error) {
      console.error('Error subscribing to push:', error);
      return null;
    }
  }, [registration, permission, isNative, fcmToken]);

  const unsubscribeFromPush = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (isNative) {
        // Remove native listeners and unregister
        await PushNotifications.removeAllListeners();
        
        if (user && fcmToken) {
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('user_id', user.id)
            .like('endpoint', `native://%/${fcmToken}`);
        }
        
        setFcmToken(null);
        setIsSubscribed(false);
        return true;
      }

      if (!registration) {
        return false;
      }

      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();

        if (user) {
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('user_id', user.id)
            .eq('endpoint', subscription.endpoint);
        }

        setIsSubscribed(false);
        console.log('Unsubscribed from push notifications');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error unsubscribing from push:', error);
      return false;
    }
  }, [registration, isNative, fcmToken]);

  const sendNotification = useCallback(async (data: NotificationData) => {
    if (permission !== 'granted') {
      console.warn('Notification permission not granted');
      return false;
    }

    try {
      if (isNative) {
        // For native, use local notification
        if ('Notification' in window) {
          new Notification(data.title, {
            body: data.body,
            icon: data.icon || '/app-icon.png',
            tag: data.tag || 'default',
          });
        }
        return true;
      }

      // Web notification via service worker
      if (registration) {
        await registration.showNotification(data.title, {
          body: data.body,
          icon: data.icon || '/app-icon.png',
          badge: '/app-icon.png',
          tag: data.tag || 'default',
          data: { url: data.url || '/' },
        });
        return true;
      }

      new Notification(data.title, {
        body: data.body,
        icon: data.icon || '/app-icon.png',
        tag: data.tag || 'default',
      });
      return true;
    } catch (error) {
      console.error('Error sending notification:', error);
      return false;
    }
  }, [permission, registration, isNative]);

  const scheduleNotification = useCallback(async (data: NotificationData, delayMs: number) => {
    if (permission !== 'granted') {
      console.warn('Notification permission not granted');
      return null;
    }

    const timeoutId = setTimeout(() => {
      sendNotification(data);
    }, delayMs);

    return timeoutId;
  }, [permission, sendNotification]);

  return {
    isSupported,
    isNative,
    permission,
    isSubscribed,
    fcmToken,
    requestPermission,
    subscribeToPush,
    unsubscribeFromPush,
    sendNotification,
    scheduleNotification,
    registration,
  };
}
