
"use client";

import { createContext, useEffect, useState, ReactNode } from "react";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
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
        // Create a provisional user object immediately with data from Firebase Auth.
        // This makes the UI feel much faster as we don't wait for the Firestore read.
        const provisionalUser: AppUser = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            role: 'Viewer', // Start with a safe, default role.
            permissions: defaultPermissions, // Use default permissions initially.
        };
        setUser(provisionalUser);
        setIsLoading(false); // Stop loading, UI can now render.

        // Now, listen for the detailed user profile from Firestore to get the correct role and permissions.
        const userDocRef = doc(db, "users", firebaseUser.uid);
        const unsubUser = onSnapshot(userDocRef, (userDoc) => {
          if (userDoc.exists()) {
            let userData = userDoc.data() as AppUser;
            
            // Admins always get all permissions.
            if (userData.role === 'Admin') {
                userData.permissions = allAdminPermissions;
            } else if (!userData.permissions) {
                // Assign default permissions if none are set.
                userData.permissions = defaultPermissions;
            }
            
            // Update the user state with the full, correct data from Firestore.
            setUser({
              ...provisionalUser, // Keep the core auth data
              ...userData,        // Override with detailed profile data
            });
          } else {
             console.warn(`No user document found for UID: ${firebaseUser.uid}. This may happen during registration.`);
             // If doc doesn't exist, we stick with the provisional user data.
             setUser(provisionalUser);
          }
        }, (error) => {
           console.error("Error fetching user document:", error);
           setUser(null);
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
