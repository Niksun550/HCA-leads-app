
"use client";

import { createContext, useEffect, useState, ReactNode } from "react";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import type { AppUser } from "@/types";
import { LoaderCircle } from "lucide-react";

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  isInitialized: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      setLoading(true);
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
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              role: 'Viewer',
            });
          }
        } catch (error) {
          console.error("Error fetching user document:", error);
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            role: 'Viewer',
          });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
      setIsInitialized(true);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, isInitialized }}>
      {!isInitialized ? (
        <div className="flex h-screen w-full items-center justify-center bg-background">
          <LoaderCircle className="h-12 w-12 animate-spin text-primary" />
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};
