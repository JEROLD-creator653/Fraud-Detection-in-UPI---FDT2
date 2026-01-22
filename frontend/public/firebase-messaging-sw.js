// Firebase Cloud Messaging Service Worker
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAHorLTy4VirROVhCYGT4bFjakhlmWSDB0",
  authDomain: "fdt-fraud-detecction-upi.firebaseapp.com",
  projectId: "fdt-fraud-detecction-upi",
  storageBucket: "fdt-fraud-detecction-upi.firebasestorage.app",
  messagingSenderId: "580819831702",
  appId: "1:580819831702:android:34d7e1041c245563772bb7"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification.title || 'FDT Fraud Alert';
  const notificationOptions = {
    body: payload.notification.body || 'Suspicious transaction detected',
    icon: '/logo192.png',
    badge: '/logo192.png',
    tag: 'fraud-alert',
    requireInteraction: true
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
