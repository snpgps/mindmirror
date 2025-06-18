
import { initializeApp, getApps, FirebaseApp, getApp } from 'firebase/app';
import { getAnalytics, Analytics, isSupported } from "firebase/analytics";
import { getAuth, GoogleAuthProvider, connectAuthEmulator } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyBMzy6-a6TMJJc33CNRqD0nmKdZpgT_ABw",
  authDomain: "mindmirror-133f1.firebaseapp.com",
  projectId: "mindmirror-133f1",
  storageBucket: "mindmirror-133f1.firebasestorage.app",
  messagingSenderId: "931783230948",
  appId: "1:931783230948:web:a93aadf9cb2c685198f3f1",
  measurementId: "G-S25D8ZVY4P"
};

let app: FirebaseApp;
let analytics: Analytics | undefined;

if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

if (typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  });
}

const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// If you want to use the Firebase Emulator Suite for local development
if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true') {
  // Ensure this only runs on the client
  if (typeof window !== 'undefined') {
    // Check if already connected to avoid re-connecting
    // This check is a bit simplistic and might need refinement based on Firebase SDK behavior
    // @ts-ignore
    if (!auth.emulatorConfig) {
        try {
            connectAuthEmulator(auth, "http://localhost:9099", { disableWarnings: true });
            console.log("Firebase Auth Emulator connected.");
        } catch (error) {
            console.error("Error connecting to Firebase Auth Emulator:", error);
        }
    }
  }
}


export { app, auth, googleProvider, analytics };
