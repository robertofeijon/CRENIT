import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { apiRequest } from "../lib/api";

const AuthContext = createContext(null);
const authStorageKey = "crenit_auth_token";

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem(authStorageKey) || "");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(token));

  useEffect(() => {
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadUser() {
      setLoading(true);
      try {
        const result = await apiRequest("/api/auth/me", { method: "GET" }, token);
        if (!cancelled) {
          setUser(result.user);
        }
      } catch {
        if (!cancelled) {
          logout();
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadUser();

    return () => {
      cancelled = true;
    };
  }, [token]);

  function saveSession(nextToken, nextUser) {
    localStorage.setItem(authStorageKey, nextToken);
    setToken(nextToken);
    setUser(nextUser || null);
  }

  function logout() {
    localStorage.removeItem(authStorageKey);
    setToken("");
    setUser(null);
  }

  async function login(payload) {
    const result = await apiRequest("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    saveSession(result.token, result.user);
    return result.user;
  }

  async function register(payload) {
    const result = await apiRequest("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    saveSession(result.token, result.user);
    return result.user;
  }

  async function forgotPassword(email) {
    return apiRequest("/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email })
    });
  }

  async function verifyResetCode(email, code) {
    return apiRequest("/api/auth/verify-reset-code", {
      method: "POST",
      body: JSON.stringify({ email, code })
    });
  }

  async function resetPassword(resetToken, password) {
    return apiRequest("/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token: resetToken, password })
    });
  }

  const value = useMemo(
    () => ({
      token,
      user,
      loading,
      isAuthenticated: Boolean(token && user),
      login,
      register,
      logout,
      forgotPassword,
      verifyResetCode,
      resetPassword
    }),
    [token, user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
