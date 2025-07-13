
export const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      // Register main service worker
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registrerad:', registration);
      
      // Also register Firebase messaging service worker
      try {
        const firebaseRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        console.log('Firebase Messaging Service Worker registrerad:', firebaseRegistration);
      } catch (firebaseError) {
        console.warn('Firebase Messaging Service Worker misslyckades:', firebaseError);
      }
      
      return registration;
    } catch (error) {
      console.error('Service Worker registrering misslyckades:', error);
    }
  }
};

export const requestNotificationPermission = async () => {
  if ('Notification' in window) {
    const permission = await Notification.requestPermission();
    console.log('Notifikationsbehörighet:', permission);
    return permission === 'granted';
  }
  return false;
};

// Send a message to the service worker
export const sendMessageToServiceWorker = (message: any): void => {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage(message);
  }
};

// Listen for messages from the service worker
export const addServiceWorkerMessageListener = (callback: (event: MessageEvent) => void): void => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', callback);
  }
};
