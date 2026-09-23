// firebase.ts
// This file centralizes Firebase configuration and initialization.

import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import 'firebase/compat/storage';
import 'firebase/compat/functions';
import 'firebase/compat/analytics';

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAEmFs79K5wfWbEtQQFzBLvAVYjkIITYfM",
  authDomain: "marketing-capsule-d1a19.firebaseapp.com",
  projectId: "marketing-capsule-d1a19",
  storageBucket: "marketing-capsule-d1a19.firebasestorage.app",
  messagingSenderId: "636053723964",
  appId: "1:636053723964:web:6236908b0971330562dc39",
  measurementId: "G-GT7HDVNEXV"
};

// Initialize Firebase
const app = !firebase.apps.length ? firebase.initializeApp(firebaseConfig) : firebase.app();
const analytics = firebase.analytics();

// Get Firebase services
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();
const functions = firebase.app().functions('asia-east1');

// Export the services for use in other parts of the app
export { app, analytics, auth, db, storage, functions };
