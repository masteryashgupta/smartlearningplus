import React, { createContext, useContext, useState, useEffect } from "react";
import { getSession, setSession as apiSetSession, clearSession as apiClearSession } from "../api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => getSession());

  useEffect(() => {
    const syncSession = () => {
      setSession(getSession());
    };
    window.addEventListener("storage", syncSession);
    return () => window.removeEventListener("storage", syncSession);
  }, []);

  const login = (token, role, name) => {
    apiSetSession(token, role, name);
    setSession({ token, role, name });
  };

  const logout = () => {
    apiClearSession();
    setSession(null);
  };

  const value = {
    session,
    login,
    logout,
    isAdmin: session?.role === "admin",
    token: session?.token || null,
    name: session?.name || null,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
