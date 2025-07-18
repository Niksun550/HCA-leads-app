
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app;
let auth;
let db;
let functions;

// This function ensures that Firebase is initialized only once.
function initializeFirebase() {
  if (!getApps().length) {
    // Check if all required environment variables are present
    if (
      !firebaseConfig.apiKey ||
      !firebaseConfig.authDomain ||
      !firebaseConfig.projectId
    ) {
      console.error("Firebase configuration is missing or incomplete. Please check your .env.local file.");
      // In a real app, you might want to throw an error or handle this differently.
      // For this context, we will prevent initialization.
      return { app: null, auth: null, db: null, functions: null };
    }
    app = initializeApp(firebaseConfig);
  } else {
    app = getApp();
  }

  auth = getAuth(app);
  db = getFirestore(app);
  functions = getFunctions(app);

  return { app, auth, db, functions };
}

// Initialize Firebase and export the instances.
const firebaseInstances = initializeFirebase();
app = firebaseInstances.app;
auth = firebaseInstances.auth;
db = firebaseInstances.db;
functions = firebaseInstances.functions;


export { app, auth, db, functions };
