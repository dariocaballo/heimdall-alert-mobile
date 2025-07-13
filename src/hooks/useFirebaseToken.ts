import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useFirebaseToken = () => {
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    // Check if Firebase messaging is available (will be implemented later)
    const checkFirebaseSupport = () => {
      // For now, just check if we're in a web environment that could support FCM
      setIsSupported(typeof window !== 'undefined' && 'serviceWorker' in navigator);
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
      // Future Firebase implementation will go here
      console.log('Firebase permission request would happen here');
      
      // For now, just simulate permission granted
      const mockToken = `mock_token_${Date.now()}`;
      setFcmToken(mockToken);
      
      // Save to localStorage for now
      localStorage.setItem('fcm_token', mockToken);
      
      return mockToken;
    } catch (error) {
      console.error('Error requesting permission:', error);
      return null;
    }
  };

  return {
    fcmToken,
    isSupported,
    requestPermission,
    saveFcmTokenToSupabase
  };
};