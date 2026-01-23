// Firebase configuration and initialization
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || 'AIzaSyDummy_Key_For_Dev_Only_12345',
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || 'fdt-fraud-detection-upi.firebaseapp.com',
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || 'fdt-fraud-detection-upi',
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || 'fdt-fraud-detection-upi.appspot.com',
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || '123456789012',
  appId: process.env.REACT_APP_FIREBASE_APP_ID || '1:123456789012:web:abcdef1234567890'
};

let app, messaging;

try {
  app = initializeApp(firebaseConfig);
  messaging = getMessaging(app);
  console.log('Firebase initialized successfully');
} catch (error) {
  console.warn('Firebase initialization warning (dev mode):', error.message);
  app = null;
  messaging = null;
}

/**
 * Request notification permission and get FCM token
 */
export const requestNotificationPermission = async () => {
  if (!messaging) {
    console.warn('Firebase messaging not initialized (dev mode)');
    return null;
  }
  
  try {
    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      const token = await getToken(messaging, {
        vapidKey: process.env.REACT_APP_FIREBASE_VAPID_KEY || 'BDummy_VAPID_Key_For_Dev_Only_12345678901234567890'
      });
      
      console.log('FCM Token:', token);
      return token;
    } else {
      console.log('Notification permission denied');
      return null;
    }
  } catch (error) {
    console.error('Error getting FCM token:', error);
    return null;
  }
};

/**
 * Listen for foreground messages
 */
export const onMessageListener = () =>
  new Promise((resolve) => {
    if (!messaging) {
      console.warn('Firebase messaging not initialized (dev mode)');
      return;
    }
    
    onMessage(messaging, (payload) => {
      console.log('Message received:', payload);
      resolve(payload);
    });
  });

export { messaging };
