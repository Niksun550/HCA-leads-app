
"use client";

import { createContext, useEffect, useState, ReactNode } from "react";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import type { AppUser } from "@/types";

interface AuthContextType {
  user: AppUser | null;
  isInitialized: boolean;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  isInitialized: false,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
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
            // This can happen if the user document wasn't created during registration
            // Or if Firestore rules prevent access temporarily
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
          // If we can't get the user doc, something is wrong. Log them out.
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
    <AuthContext.Provider value={{ user, isInitialized }}>
      {children}
    </AuthContext.Provider>
  );
};
