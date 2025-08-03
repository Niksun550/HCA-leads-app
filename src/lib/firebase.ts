
import { initializeApp, getApps, getApp, type FirebaseOptions } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// This function checks if all the necessary Firebase environment variables are set.
const isFirebaseConfigured = () => {
    return (
        firebaseConfig.apiKey &&
        firebaseConfig.authDomain &&
        firebaseConfig.projectId &&
        firebaseConfig.storageBucket &&
        firebaseConfig.messagingSenderId &&
        firebaseConfig.appId
    );
};

interface FirebaseServices {
    auth: Auth | null;
    db: Firestore | null;
    storage: FirebaseStorage | null;
    isConfigured: boolean;
}

// This function initializes and returns the Firebase services.
export function getFirebaseServices(): FirebaseServices {
    const configured = isFirebaseConfigured();
    if (!configured) {
        if (process.env.NODE_ENV !== 'test') {
            console.warn("Firebase is not configured. Please check your .env.local file.");
        }
        return { auth: null, db: null, storage: null, isConfigured: false };
    }

    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    const auth = getAuth(app);
    const db = getFirestore(app);
    const storage = getStorage(app);

    return { auth, db, storage, isConfigured: true };
}
