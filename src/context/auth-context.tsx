
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
              role: userData.role || 'Viewer',
            });
          } else {
            setUser(null);
          }
        } catch (error) {
          console.error("Error fetching user document:", error);
          setUser(null);
        } finally {
           setIsInitialized(true);
        }
      } else {
        setUser(null);
        setIsInitialized(true);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, isInitialized }}>
      {children}
    </AuthContext.Provider>
  );
};
