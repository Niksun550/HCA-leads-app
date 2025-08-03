
"use client";

import { useContext } from "react";
import { AuthContext } from "@/context/auth-context";

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  // isInitialized is deprecated, use isLoading instead
  const { isLoading, ...rest } = context;
  return { ...rest, isInitialized: !isLoading, isLoading };
};
