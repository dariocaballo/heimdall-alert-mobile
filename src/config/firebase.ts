import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC_nk4IyViUofvyIdaYq2iU7WfYCVNTiPE",
  authDomain: "id-bedragarna.firebaseapp.com",
  projectId: "id-bedragarna",
  storageBucket: "id-bedragarna.firebasestorage.app",
  messagingSenderId: "123448584214",
  appId: "1:123448584214:android:d957a0a4dcd1e714e32d37"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Cloud Messaging and get a reference to the service
export const messaging = getMessaging(app);

// VAPID key for push notifications
export const vapidKey = "BDPA6CJTREnWvIzyOMP4yBpHiXS9udrcx-x-jdu7cU_M6E69wpEgSzpZkFWXLJL1Q063fnGWbls1OJYcLKfIeJo";

export { getToken, onMessage };