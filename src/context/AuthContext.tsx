import React, { createContext, useContext, useState, useEffect } from "react";
import { User, AuthState } from "../types.js";
import { getBrowserSupabase } from "../lib/supabaseClient.js";

interface AuthContextType extends AuthState {
  login: (email: string, password: string, rememberMe?: boolean) => Promise<User>;
  signUp: (name: string, email: string, password: string, confirmPassword?: string) => Promise<void>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<{ resetLink?: string; message: string }>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: localStorage.getItem("token") || localStorage.getItem("admin_token"),
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });

  const clearError = () => setState((prev) => ({ ...prev, error: null }));

  const verifyTokenAndSetUser = async (tokenStr: string): Promise<User | null> => {
    try {
      const response = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${tokenStr}` },
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem("token", tokenStr);
        localStorage.setItem("admin_token", tokenStr);
        setState({
          user: data.user,
          token: tokenStr,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
        return data.user;
      }
    } catch (err) {
      console.warn("Failed to verify token with /api/auth/me:", err);
    }
    return null;
  };

  useEffect(() => {
    let authSubscription: any = null;

    const initAuthSession = async () => {
      try {
        const client = await getBrowserSupabase();

        if (client) {
          const { data: { subscription } } = client.auth.onAuthStateChange(async (event, session) => {
            if (session?.access_token) {
              localStorage.setItem("token", session.access_token);
              localStorage.setItem("admin_token", session.access_token);
              if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
                await verifyTokenAndSetUser(session.access_token);
              }
            } else if (event === "SIGNED_OUT") {
              localStorage.removeItem("token");
              localStorage.removeItem("admin_token");
              localStorage.removeItem("super_admin_orig_token");
              localStorage.removeItem("impersonation_token");
              setState({
                user: null,
                token: null,
                isAuthenticated: false,
                isLoading: false,
                error: null,
              });
            }
          });
          authSubscription = subscription;

          const { data: { session } } = await client.auth.getSession();
          if (session?.access_token) {
            const verifiedUser = await verifyTokenAndSetUser(session.access_token);
            if (verifiedUser) return;
          }
        }

        const existingToken = localStorage.getItem("token") || localStorage.getItem("admin_token");
        if (existingToken) {
          const verifiedUser = await verifyTokenAndSetUser(existingToken);
          if (verifiedUser) return;
        }

        const refreshRes = await fetch("/api/auth/refresh", { method: "POST" });
        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          if (refreshData.token) {
            localStorage.setItem("token", refreshData.token);
            localStorage.setItem("admin_token", refreshData.token);
            setState({
              user: refreshData.user,
              token: refreshData.token,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });
            return;
          }
        }
      } catch (err) {
        console.error("Auth session initialization error:", err);
      } finally {
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    };

    initAuthSession();

    return () => {
      if (authSubscription) authSubscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string, rememberMe: boolean = false): Promise<User> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const client = await getBrowserSupabase();
      let supabaseAccessToken: string | null = null;

      if (client) {
        try {
          const { data, error } = await client.auth.signInWithPassword({
            email,
            password,
          });

          if (!error && data?.session?.access_token) {
            supabaseAccessToken = data.session.access_token;
            localStorage.setItem("token", supabaseAccessToken);
            localStorage.setItem("admin_token", supabaseAccessToken);
          }
        } catch (sbErr) {
          console.warn("Client Supabase Auth signIn notice:", sbErr);
        }
      }

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, rememberMe }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Login failed. Please check your credentials.");
      }

      const finalToken = supabaseAccessToken || data.token;
      localStorage.setItem("token", finalToken);
      localStorage.setItem("admin_token", finalToken);

      setState({
        user: data.user,
        token: finalToken,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      return data.user;
    } catch (err: any) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err.message,
      }));
      throw err;
    }
  };

  const signUp = async (name: string, email: string, password: string, confirmPassword?: string) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, confirmPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Account creation failed.");
      }

      setState((prev) => ({ ...prev, isLoading: false }));
    } catch (err: any) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err.message,
      }));
      throw err;
    }
  };

  const logout = async () => {
    setState((prev) => ({ ...prev, isLoading: true }));
    try {
      const client = await getBrowserSupabase();
      if (client) {
        await client.auth.signOut().catch(() => {});
      }
      const token = state.token;
      if (token) {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {});
      }
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      localStorage.removeItem("token");
      localStorage.removeItem("admin_token");
      localStorage.removeItem("super_admin_orig_token");
      localStorage.removeItem("impersonation_token");
      setState({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    }
  };

  const forgotPassword = async (email: string) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not request password reset.");
      }

      setState((prev) => ({ ...prev, isLoading: false }));
      return { resetLink: data.resetLink, message: data.message };
    } catch (err: any) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err.message,
      }));
      throw err;
    }
  };

  const resetPassword = async (token: string, newPassword: string) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to reset password.");
      }

      setState((prev) => ({ ...prev, isLoading: false }));
    } catch (err: any) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err.message,
      }));
      throw err;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        signUp,
        logout,
        forgotPassword,
        resetPassword,
        clearError,
      }}
    >
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

import { authFetch } from "../lib/authUtils.js";
export { authFetch };
