
"use client";

import { createContext, useEffect, useState, ReactNode } from "react";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { getFirebaseServices } from "@/lib/firebase";
import type { AppUser } from "@/types";

interface AuthContextType {
  user: AppUser | null;
  isInitialized: boolean;
  isFirebaseConfigured: boolean;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  isInitialized: false,
  isFirebaseConfigured: false,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isFirebaseConfigured, setIsFirebaseConfigured] = useState(false);

  useEffect(() => {
    const { auth, db, isConfigured } = getFirebaseServices();
    setIsFirebaseConfigured(isConfigured);

    if (!isConfigured || !auth) {
      setIsInitialized(true);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        try {
          const userDocRef = doc(db, "users", firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName || userData.displayName,
              role: userData.role || 'Viewer', // Default to 'Viewer' if role not set
            });
          } else {
            console.warn(`No user document found for UID: ${firebaseUser.uid}. Defaulting role.`);
             setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              role: 'Sales Rep', // Fallback role
            });
          }
        } catch (error) {
          console.error("Error fetching user document:", error);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setIsInitialized(true);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, isInitialized, isFirebaseConfigured }}>
      {children}
    </AuthContext.Provider>
  );
};
