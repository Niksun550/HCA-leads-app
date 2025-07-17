
"use client";

import { createContext, useEffect, useState, ReactNode } from "react";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import type { AppUser } from "@/types";
import { LoaderCircle } from "lucide-react";

interface AuthContextType {
  user: AppUser | null;
  loading: boolean; // Kept for legacy compatibility if needed, but isInitialized is preferred.
  isInitialized: boolean;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
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
            // This case might happen for a brief moment or if user doc creation failed
             await signOut(auth); // Log out if user doc doesn't exist
             setUser(null);
          }
        } catch (error) {
          console.error("Error fetching user document:", error);
           await signOut(auth); // Log out on error
           setUser(null);
        }
      } else {
        setUser(null);
      }
      // Defer setting initialized to ensure state propagation.
      setTimeout(() => setIsInitialized(true), 0);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading: !isInitialized, isInitialized }}>
      {isInitialized ? children : (
        <div className="flex h-screen w-full items-center justify-center bg-background">
          <LoaderCircle className="h-12 w-12 animate-spin text-primary" />
        </div>
      )}
    </AuthContext.Provider>
  );
};
