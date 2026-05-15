import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Profile } from "@workspace/api-client-react";
import { useLocation } from "wouter";

interface AuthContextType {
  profile: Profile | null;
  isLoading: boolean;
  login: (profile: Profile, redirect?: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, setLocation] = useLocation();

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error("Not authenticated");
      })
      .then((data) => {
        setProfile(data.profile ?? data);
      })
      .catch(() => {
        setProfile(null);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const login = (newProfile: Profile, redirect?: string) => {
    setProfile(newProfile);
    setLocation(redirect || "/dashboard");
  };

  const logout = () => {
    fetch("/api/auth/logout", { method: "POST", credentials: "include" }).then(() => {
      setProfile(null);
      setLocation("/sign-in");
    });
  };

  return (
    <AuthContext.Provider value={{ profile, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
