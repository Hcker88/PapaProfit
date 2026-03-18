import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Default empty config to prevent crash if file is missing/invalid
let firebaseConfig: any = {
  apiKey: "placeholder",
  authDomain: "placeholder",
  projectId: "placeholder",
  storageBucket: "placeholder",
  messagingSenderId: "placeholder",
  appId: "placeholder",
  measurementId: ""
};

try {
  // Try to load the actual config
  // Note: Using dynamic import to handle potential missing file at build/runtime
  const config = await import('../firebase-applet-config.json');
  firebaseConfig = config.default || config;
} catch (e) {
  console.error("Could not load firebase-applet-config.json. Please ensure it exists in the root folder.", e);
}

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const googleProvider = new GoogleAuthProvider();
