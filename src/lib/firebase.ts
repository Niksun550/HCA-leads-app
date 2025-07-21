
"use client";

import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

interface FirebaseServices {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
  storage: FirebaseStorage;
  isConfigured: boolean;
}

let services: FirebaseServices | null = null;

export function getFirebaseServices(): FirebaseServices {
  if (services) {
    return services;
  }

  const isConfigured = !!firebaseConfig.projectId;
  
  if (!isConfigured) {
    // This is a dummy implementation for when firebase is not configured
    // to prevent app from crashing.
    const unconfiguredApp = {} as FirebaseApp;
    const unconfiguredAuth = {} as Auth;
    const unconfiguredDb = {} as Firestore;
    const unconfiguredStorage = {} as FirebaseStorage;
    services = {
      app: unconfiguredApp,
      auth: unconfiguredAuth,
      db: unconfiguredDb,
      storage: unconfiguredStorage,
      isConfigured: false,
    };
    return services;
  }

  const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  const auth = getAuth(app);
  const db = getFirestore(app);
  const storage = getStorage(app);

  services = { app, auth, db, storage, isConfigured: true };
  return services;
}
