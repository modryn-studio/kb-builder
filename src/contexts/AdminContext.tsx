"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface AdminContextType {
  isAuthenticated: boolean;
  isChecking: boolean;
  authenticate: (key: string) => Promise<boolean>;
  logout: () => void;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  const validateKey = async (key: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/admin/feedback?key=${encodeURIComponent(key)}`);
      return response.ok;
    } catch {
      return false;
    }
  };

  const authenticate = async (key: string): Promise<boolean> => {
    setIsChecking(true);
    const isValid = await validateKey(key);
    
    if (isValid) {
      sessionStorage.setItem("kb_admin_key", key);
      setIsAuthenticated(true);
    } else {
      sessionStorage.removeItem("kb_admin_key");
      setIsAuthenticated(false);
    }
    
    setIsChecking(false);
    return isValid;
  };

  const logout = () => {
    sessionStorage.removeItem("kb_admin_key");
    setIsAuthenticated(false);
  };

  // Check for stored key on mount (only once)
  useEffect(() => {
    const stored = sessionStorage.getItem("kb_admin_key");
    if (stored) {
      authenticate(stored);
    } else {
      setIsChecking(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  return (
    <AdminContext.Provider value={{ isAuthenticated, isChecking, authenticate, logout }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error("useAdmin must be used within AdminProvider");
  }
  return context;
}
