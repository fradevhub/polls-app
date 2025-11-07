/* React */
import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";

// Type for user
type User = {
  id: string;
  email: string;
  role: "user" | "admin";
  username?: string;
};

// Type for AuthContext
type AuthContextValue = {
  user: User | null;
  token: string | null;
  login: (data: { token: string; user: User }) => void;
  logout: () => void;
  isAuthenticated: boolean
};

// create AuthContext
const AuthContext = createContext<AuthContextValue | undefined>(undefined);


/* Auth provider */
// Provide global authentication state (user + token).
// Restore data from localStorage, updates on login/logout and shares auth methods via context.
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // Bootstrap from localStorage
  useEffect(() => {
    const t = localStorage.getItem("token");
    const u = localStorage.getItem("user");
    if (t && u) {
      setToken(t);
      setUser(JSON.parse(u) as User);
    }
  }, []);

  // Update localStorage on login
  const login = (data: { token: string; user: User }) => {
  // derive username from email before saving
  const rawName = data.user.email.split("@")[0];
  const username = rawName.charAt(0).toUpperCase() + rawName.slice(1);
  const userWithUsername = { ...data.user, username };

  setToken(data.token);
  setUser(userWithUsername);

  localStorage.setItem("token", data.token);
  localStorage.setItem("user", JSON.stringify(userWithUsername));
};

  // Remove localStorage on logout
  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  };

  // Return the provider
  return (
    <AuthContext.Provider
      value={{ user, token, login, logout, isAuthenticated: !!token }}
    >
      {children}
    </AuthContext.Provider>
  );
}


/* useAuth hook */
// Custom hook to access the authentication context.
// Throws an error if used outside <AuthProvider>.
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}