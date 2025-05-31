
'use client';

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  type User
} from 'firebase/auth';

// Your web app's Firebase configuration from environment variables
const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
const messagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;
const measurementId = process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID; // Optional
const databaseURL = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL; // Optional

// --- Enhanced Firebase Configuration Checks ---

if (!apiKey) {
  console.error(
    "CRITICAL: NEXT_PUBLIC_FIREBASE_API_KEY is MISSING in your .env file. Firebase will not work. " +
    "Please obtain it from your Firebase project console (Project settings > General > Your apps)."
  );
} else if (apiKey === "YOUR_FIREBASE_API_KEY_PLACEHOLDER" || apiKey.includes("YOUR_") || apiKey.length < 20) {
  console.warn(
    "WARNING: NEXT_PUBLIC_FIREBASE_API_KEY in .env appears to be a placeholder, too short, or invalid. " +
    "Firebase authentication will likely fail. Please verify it in your Firebase project console. " +
    "Current key (first 5 chars): " + apiKey.substring(0, 5) + "..."
  );
}

if (!authDomain) {
  console.error(
    "CRITICAL: NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN is MISSING in your .env file. Firebase will not work. " +
    "Expected format: your-project-id.firebaseapp.com. Get it from your Firebase project console."
  );
} else if (authDomain.includes("YOUR_") || !authDomain.includes(".firebaseapp.com")) {
  console.warn(
    "WARNING: NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN in .env seems to be a placeholder or incorrectly formatted. " +
    "Expected format: your-project-id.firebaseapp.com. Please verify. Current value: ", authDomain
  );
}

if (!projectId) {
  console.error(
    "CRITICAL: NEXT_PUBLIC_FIREBASE_PROJECT_ID is MISSING in your .env file. Firebase will not work. " +
    "Get it from your Firebase project console."
  );
} else if (projectId.includes("YOUR_")) {
  console.warn(
    "WARNING: NEXT_PUBLIC_FIREBASE_PROJECT_ID in .env appears to be a placeholder. Please verify. Current value: ", projectId
  );
}

// Optional, but good to check
if (!storageBucket) {
  console.warn("NOTICE: NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET is missing in .env. Firebase Storage will not work.");
} else if (!storageBucket.includes(".appspot.com")) {
  console.warn("WARNING: NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET in .env seems incorrectly formatted. Expected format: your-project-id.appspot.com. Current: ", storageBucket);
}

if (!messagingSenderId) {
  console.warn("NOTICE: NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID is missing in .env. Firebase Cloud Messaging (FCM) will not work.");
}

if (!appId) {
  console.warn("NOTICE: NEXT_PUBLIC_FIREBASE_APP_ID is missing in .env. Some Firebase integrations might be affected.");
} else if (!appId.includes(":web:") && !appId.includes(":ios:") && !appId.includes(":android:")) { // Simplified check
  console.warn("WARNING: NEXT_PUBLIC_FIREBASE_APP_ID in .env seems incorrectly formatted. Expected format: 1:your-sender-id:web:your-app-hash (for web). Current: ", appId);
}


const firebaseConfig = {
  apiKey: apiKey,
  authDomain: authDomain,
  projectId: projectId,
  storageBucket: storageBucket,
  messagingSenderId: messagingSenderId,
  appId: appId,
  measurementId: measurementId, 
  databaseURL: databaseURL,
};

// Initialize Firebase
let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { 
  app as firebaseApp, // Exporting the app instance if needed elsewhere
  auth, 
  googleProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User
};

// Helper function for Google Sign-In
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    // Ensure we have the user's Google profile data
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const user = result.user;
    
    // Make sure we update the user profile with Google data if needed
    if (user && (!user.photoURL || !user.displayName) && auth.currentUser) {
      const updates: { photoURL?: string; displayName?: string } = {};
      if (!user.photoURL && result.user.photoURL) {
        updates.photoURL = result.user.photoURL;
      }
      if (!user.displayName && result.user.displayName) {
        updates.displayName = result.user.displayName;
      }
      if (Object.keys(updates).length > 0) {
        await updateProfile(auth.currentUser, updates);
      }
    }
    
    return { user: user, error: null };
  } catch (error: any) {
    console.error("Google Sign-In error raw: ", error);
    let errorMessage = "Google Sign-In failed. Please try again.";
    if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = "Sign-in popup closed before completion.";
    } else if (error.code === 'auth/cancelled-popup-request') {
        errorMessage = "Sign-in popup request cancelled.";
    } else if (error.code === 'auth/popup-blocked') {
        errorMessage = "Sign-in popup was blocked by the browser. Please allow popups.";
    }  else if (error.code === 'auth/api-key-not-valid' || error.message.includes('apiKey') || error.message.includes('API key')) {
      errorMessage = "Firebase API Key is invalid or missing. Please check your NEXT_PUBLIC_FIREBASE_API_KEY in the .env file and ensure it matches your Firebase project settings.";
    } else if (error.message.includes('authDomain')) {
        errorMessage = "Firebase authDomain is invalid. Please check your NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN in the .env file.";
    }
    return { user: null, error: errorMessage };
  }
};

