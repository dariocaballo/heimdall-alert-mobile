
export const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registrerad:', registration);
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
