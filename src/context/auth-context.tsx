
"use client";

import { createContext, useEffect, useState, ReactNode } from "react";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { getFirebaseServices } from "@/lib/firebase";
import type { AppUser, RolePermissions } from "@/types";

interface AuthContextType {
  user: AppUser | null;
  isLoading: boolean;
  isFirebaseConfigured: boolean;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isFirebaseConfigured: false,
});

const allAdminPermissions: RolePermissions = {
    navItems: {
        dashboard: true,
        communication: true,
        utility: true,
        tasks: true,
        planner: true,
        tools: true,
        board: true,
        settings: true,
        admin: true,
    }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthContextType['user']>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFirebaseConfigured, setIsFirebaseConfigured] = useState(false);

  useEffect(() => {
    const { auth, db, isConfigured } = getFirebaseServices();
    setIsFirebaseConfigured(isConfigured);

    if (!isConfigured || !auth) {
      setIsLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        try {
          const userDocRef = doc(db, "users", firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            const userData = userDoc.data() as AppUser;
            
            // Admins get all permissions, everyone else gets what's on their user document
            if (userData.role === 'Admin') {
                userData.permissions = allAdminPermissions;
            }
            
            setUser({
              ...userData,
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName || userData.displayName,
              photoURL: firebaseUser.photoURL || userData.photoURL,
            });
          } else {
            console.warn(`No user document found for UID: ${firebaseUser.uid}.`);
             setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              role: 'Sales Rep', // Fallback role
              photoURL: firebaseUser.photoURL,
            });
          }
        } catch (error) {
          console.error("Error fetching user document:", error);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, isFirebaseConfigured }}>
      {children}
    </AuthContext.Provider>
  );
};
