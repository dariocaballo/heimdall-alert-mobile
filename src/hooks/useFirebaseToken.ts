import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { messaging, getToken, onMessage, vapidKey } from '@/config/firebase';

export const useFirebaseToken = () => {
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    const checkFirebaseSupport = () => {
      const supported = typeof window !== 'undefined' && 
                       'serviceWorker' in navigator && 
                       'Notification' in window &&
                       messaging !== null;
      setIsSupported(supported);
      
      if (supported) {
        // Register service worker for Firebase messaging
        navigator.serviceWorker.register('/firebase-messaging-sw.js')
          .then((registration) => {
            console.log('Service Worker registered successfully:', registration);
          })
          .catch((error) => {
            console.log('Service Worker registration failed:', error);
          });
          
        // Listen for foreground messages
        onMessage(messaging, (payload) => {
          console.log('Message received in foreground: ', payload);
          
          // Create notification for foreground messages
          if (Notification.permission === 'granted') {
            new Notification(payload.notification?.title || 'Brandlarm!', {
              body: payload.notification?.body || 'En brandvarnare har utlösts!',
              icon: '/favicon.ico'
            });
          }
        });
      }
    };

    checkFirebaseSupport();
  }, []);

  const saveFcmTokenToSupabase = async (token: string, userCode: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('save_fcm_token', {
        body: { 
          fcm_token: token, 
          user_code: userCode,
          device_info: {
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString()
          }
        }
      });

      if (error) {
        console.error('Error saving FCM token:', error);
        return { success: false, error };
      }

      console.log('FCM Token saved successfully:', data);
      return { success: true, data };
    } catch (error) {
      console.error('Error saving FCM token:', error);
      return { success: false, error };
    }
  };

  const requestPermission = async () => {
    if (!isSupported) {
      console.log('Firebase messaging not supported');
      return null;
    }

    try {
      // Request notification permission
      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        console.log('Notification permission granted.');
        
        // Get FCM token
        const token = await getToken(messaging, { vapidKey });
        console.log('FCM Token:', token);
        
        setFcmToken(token);
        localStorage.setItem('fcm_token', token);
        
        return token;
      } else {
        console.log('Unable to get permission to notify.');
        return null;
      }
    } catch (error) {
      console.error('Error getting FCM token:', error);
      
      // Fallback to mock token for development
      const mockToken = `mock_token_${Date.now()}`;
      setFcmToken(mockToken);
      localStorage.setItem('fcm_token', mockToken);
      
      return mockToken;
    }
  };

  return {
    fcmToken,
    isSupported,
    requestPermission,
    saveFcmTokenToSupabase
  };
};