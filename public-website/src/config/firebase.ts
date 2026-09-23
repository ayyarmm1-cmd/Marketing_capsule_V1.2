// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAnalytics, Analytics, isSupported } from 'firebase/analytics';

// Your web app's Firebase configuration for public website
// Different appId from ERP but same Firebase project
const firebaseConfig = {
  apiKey: 'AIzaSyAEmFs79K5wfWbEtQQFzBLvAVYjkIITYfM',
  authDomain: 'marketing-capsule-d1a19.firebaseapp.com',
  projectId: 'marketing-capsule-d1a19',
  storageBucket: 'marketing-capsule-d1a19.firebasestorage.app',
  messagingSenderId: '636053723964',
  appId: '1:636053723964:web:247b5393a92182c862dc39',
  measurementId: 'G-5J08ZLRJLL',
};

// Initialize Firebase with a specific name to avoid conflicts with ERP Firebase instance
const PUBLIC_WEBSITE_APP_NAME = 'public-website-app';
let app: FirebaseApp;
let analytics: Analytics | null = null;

if (typeof window !== 'undefined') {
  // Check if public website app already exists, otherwise initialize
  try {
    app = getApp(PUBLIC_WEBSITE_APP_NAME);
  } catch (e) {
    // App doesn't exist, initialize it
    app = initializeApp(firebaseConfig, PUBLIC_WEBSITE_APP_NAME);
  }

  // Initialize Analytics only in browser environment
  isSupported().then((supported) => {
    if (supported) {
      try {
        analytics = getAnalytics(app);
      } catch (e) {
        // Analytics might already be initialized
        console.warn('Analytics initialization warning:', e);
      }
    }
  });
} else {
  // For server-side rendering, just initialize the app
  try {
    app = getApp(PUBLIC_WEBSITE_APP_NAME);
  } catch (e) {
    app = initializeApp(firebaseConfig, PUBLIC_WEBSITE_APP_NAME);
  }
}

export { app, analytics };
export default app;

