
"use client";

import { createContext, useEffect, useState, ReactNode } from "react";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
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

const defaultPermissions: RolePermissions = {
    navItems: {
        dashboard: true,
        communication: true,
        utility: true,
        tasks: true,
        planner: true,
        tools: true,
        board: true,
        settings: true,
        admin: false,
    }
};

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

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        const userDocRef = doc(db, "users", firebaseUser.uid);
        
        // Use onSnapshot to listen for real-time updates to user doc (e.g. role changes)
        const unsubUser = onSnapshot(userDocRef, (userDoc) => {
          if (userDoc.exists()) {
            let userData = userDoc.data() as AppUser;
            
            if (userData.role === 'Admin') {
                userData.permissions = allAdminPermissions;
            } else if (!userData.permissions) {
                userData.permissions = defaultPermissions;
            }
            
            setUser({
              ...userData,
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName || userData.displayName,
              photoURL: firebaseUser.photoURL || userData.photoURL,
            });
          } else {
             console.warn(`No user document found for UID: ${firebaseUser.uid}. This may happen during registration.`);
             setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              role: 'Sales Rep', // Fallback role
              photoURL: firebaseUser.photoURL,
              permissions: defaultPermissions
            });
          }
           setIsLoading(false);
        }, (error) => {
           console.error("Error fetching user document:", error);
           setUser(null);
           setIsLoading(false);
        });
        
        return () => unsubUser(); // Unsubscribe from user doc listener on cleanup

      } else {
        setUser(null);
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, isFirebaseConfigured }}>
      {children}
    </AuthContext.Provider>
  );
};
