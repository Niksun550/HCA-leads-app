
"use client";

import { createContext, useEffect, useState, ReactNode } from "react";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { getFirebaseServices } from "@/lib/firebase";
import type { AppUser, RolePermissions } from "@/types";

interface AuthContextType {
  user: (AppUser & { getIdToken: () => Promise<string | null>; permissions?: RolePermissions; }) | null;
  isLoading: boolean;
  isFirebaseConfigured: boolean;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isFirebaseConfigured: false,
});

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
          
          const getIdToken = () => firebaseUser.getIdToken();

          if (userDoc.exists()) {
            const userData = userDoc.data() as AppUser;
            
            // Fetch role permissions
            let permissions: RolePermissions | undefined = undefined;
            if (userData.role) {
                try {
                    const permissionDocRef = doc(db, "rolePermissions", userData.role);
                    const permissionDoc = await getDoc(permissionDocRef);
                    if(permissionDoc.exists()) {
                        permissions = permissionDoc.data() as RolePermissions;
                    } else {
                        console.warn(`No permission document found for role: ${userData.role}`);
                    }
                } catch(permError) {
                    console.error("Error fetching role permissions:", permError);
                }
            }
            
            setUser({
              ...userData,
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName || userData.displayName,
              photoURL: firebaseUser.photoURL || userData.photoURL,
              getIdToken,
              permissions,
            });
          } else {
            console.warn(`No user document found for UID: ${firebaseUser.uid}. Defaulting role.`);
             setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              role: 'Sales Rep', // Fallback role
              photoURL: firebaseUser.photoURL,
              getIdToken,
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
