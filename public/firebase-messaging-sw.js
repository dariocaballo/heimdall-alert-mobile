// Give the service worker access to Firebase Messaging
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker
firebase.initializeApp({
  apiKey: "AIzaSyC_nk4IyViUofvyIdaYq2iU7WfYCVNTiPE",
  authDomain: "id-bedragarna.firebaseapp.com",
  projectId: "id-bedragarna",
  storageBucket: "id-bedragarna.firebasestorage.app",
  messagingSenderId: "123448584214",
  appId: "1:123448584214:android:d957a0a4dcd1e714e32d37"
});

// Retrieve an instance of Firebase Messaging so that it can handle background messages
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification?.title || 'Brandlarm!';
  const notificationOptions = {
    body: payload.notification?.body || 'En brandvarnare har utlösts!',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: 'fire-alarm',
    requireInteraction: true,
    actions: [
      {
        action: 'view',
        title: 'Visa'
      },
      {
        action: 'dismiss', 
        title: 'Stäng'
      }
    ]
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', function(event) {
  console.log('[firebase-messaging-sw.js] Notification click received.');

  event.notification.close();

  if (event.action === 'view') {
    // Open the app
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});