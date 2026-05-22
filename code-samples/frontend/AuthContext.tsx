import React, { createContext, useState, useContext, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

/**
 * Authentication context for the SPA.
 *
 * Strategy:
 *  - Credentials are POSTed to /api/auth/login. The backend sets an HttpOnly
 *    AUTH-TOKEN cookie (the secure transport) AND returns a JSON body with
 *    the user's profile + role for the UI to display.
 *  - We persist the *user profile* (not the token) in sessionStorage so the
 *    UI can rehydrate the role badge / nav on reload. The token itself is
 *    never readable from JS.
 *  - Auth state is checked against the server on protected routes; the
 *    frontend never assumes the local state is sufficient for authorization.
 */
interface User {
  username: string;
  role: "ADMIN" | "DOCTOR" | "NURSE";
  fullName: string;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: async () => {},
  logout: async () => {},
  isAuthenticated: false,
  loading: true,
});

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8080";

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const stored = sessionStorage.getItem("user");
    if (stored) {
      try { setUser(JSON.parse(stored)); }
      catch { sessionStorage.removeItem("user"); }
    }
    setLoading(false);
  }, []);

  const login = async (username: string, password: string) => {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (!res.ok) {
      const msg = (await res.json().catch(() => ({}))).error ?? "Invalid credentials";
      toast({ title: "Login failed", description: msg, variant: "destructive" });
      throw new Error(msg);
    }

    const data = await res.json();
    const profile: User = {
      username: data.username,
      role: data.role,
      fullName: data.fullName ?? data.username,
    };
    sessionStorage.setItem("user", JSON.stringify(profile));
    setUser(profile);
    toast({ title: "Welcome", description: profile.fullName });
  };

  const logout = async () => {
    await fetch(`${API_BASE}/api/auth/logout`, { method: "POST", credentials: "include" })
      .catch(() => {});
    sessionStorage.removeItem("user");
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, login, logout, isAuthenticated: !!user, loading }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
