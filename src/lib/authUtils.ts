// Utility for fetching and refreshing authentication tokens seamlessly
import { getBrowserSupabase } from "./supabaseClient.js";

export function decodeJwtPayload(token: string): any | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

export function isTokenExpired(token: string, bufferSeconds = 60): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload || !payload.exp) return true;
  const expMs = payload.exp * 1000;
  return Date.now() + bufferSeconds * 1000 >= expMs;
}

export async function refreshAuthToken(): Promise<string | null> {
  const currentToken =
    localStorage.getItem("token") || localStorage.getItem("admin_token");

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (currentToken) {
      headers["Authorization"] = `Bearer ${currentToken}`;
    }

    const res = await fetch("/api/auth/refresh", {
      method: "POST",
      headers,
    });

    if (res.ok) {
      const data = await res.json();
      if (data.token) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("admin_token", data.token);
        return data.token;
      }
    }
  } catch (e) {
    console.warn("Failed to refresh auth token:", e);
  }

  return null;
}

export function clearSessionAndRedirectExpired(message = "Your session expired. Please login again.") {
  localStorage.removeItem("token");
  localStorage.removeItem("admin_token");
  localStorage.removeItem("super_admin_orig_token");
  localStorage.removeItem("impersonation_token");

  try {
    getBrowserSupabase().then((client) => client?.auth.signOut().catch(() => {}));
  } catch (e) {}

  if (typeof window !== "undefined") {
    if (!window.location.pathname.startsWith("/login")) {
      window.location.href = `/login?expired=1&msg=${encodeURIComponent(message)}`;
    }
  }
}

export async function getValidAuthToken(): Promise<string | null> {
  let client: any = null;
  try {
    client = await getBrowserSupabase();
  } catch (e) {
    console.warn("Could not retrieve Supabase browser client:", e);
  }

  // 1. Verify Supabase session using supabase.auth.getSession()
  if (client) {
    try {
      const { data: { session }, error: sessionError } = await client.auth.getSession();

      if (session && !sessionError && session.access_token) {
        const expiresAt = session.expires_at; // timestamp in seconds
        const now = Math.floor(Date.now() / 1000);

        // If access token is valid and not expiring in next 60s
        if (!expiresAt || (expiresAt - now) > 60) {
          localStorage.setItem("token", session.access_token);
          localStorage.setItem("admin_token", session.access_token);
          return session.access_token;
        }

        // 2. If access token is expired: Automatically refresh token using supabase.auth.refreshSession()
        console.log("Supabase session expired or close to expiry. Calling refreshSession()...");
        const { data: refreshData, error: refreshError } = await client.auth.refreshSession();

        if (!refreshError && refreshData.session?.access_token) {
          const newToken = refreshData.session.access_token;
          localStorage.setItem("token", newToken);
          localStorage.setItem("admin_token", newToken);
          return newToken;
        } else {
          console.warn("Supabase refreshSession failed:", refreshError);
        }
      } else {
        // Attempt direct refreshSession
        const { data: refreshData, error: refreshError } = await client.auth.refreshSession();
        if (!refreshError && refreshData.session?.access_token) {
          const newToken = refreshData.session.access_token;
          localStorage.setItem("token", newToken);
          localStorage.setItem("admin_token", newToken);
          return newToken;
        }
      }
    } catch (sbErr) {
      console.warn("Supabase session verification error:", sbErr);
    }
  }

  // Fallback to local storage JWT check
  const localToken = localStorage.getItem("token") || localStorage.getItem("admin_token");
  if (localToken && !isTokenExpired(localToken)) {
    return localToken;
  }

  // Fallback API token refresh endpoint
  const backendRefreshed = await refreshAuthToken();
  if (backendRefreshed) {
    return backendRefreshed;
  }

  // 3. If refresh fails: Return null
  return null;
}

export async function authFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  // Always verify authentication session and token before database/settings updates
  const token = await getValidAuthToken();

  if (!token) {
    clearSessionAndRedirectExpired("Your session expired. Please login again.");
    throw new Error("Your session expired. Please login again.");
  }

  const headers = new Headers(options.headers || {});
  headers.set("Authorization", `Bearer ${token}`);

  let res = await fetch(url, { ...options, headers });

  // Handle errors: Invalid token, JWT expired, Unauthorized
  if (res.status === 401 || res.status === 403) {
    // Attempt one automatic session refresh and retry
    const client = await getBrowserSupabase().catch(() => null);
    let refreshedToken: string | null = null;

    if (client) {
      const { data: refreshData } = await client.auth.refreshSession().catch(() => ({ data: { session: null } }));
      if (refreshData.session?.access_token) {
        refreshedToken = refreshData.session.access_token;
        localStorage.setItem("token", refreshedToken);
        localStorage.setItem("admin_token", refreshedToken);
      }
    }

    if (!refreshedToken) {
      refreshedToken = await refreshAuthToken();
    }

    if (refreshedToken) {
      const retryHeaders = new Headers(options.headers || {});
      retryHeaders.set("Authorization", `Bearer ${refreshedToken}`);
      res = await fetch(url, { ...options, headers: retryHeaders });
      if (res.ok) return res;
    }

    // Refresh failed -> clear invalid session and redirect user to login page
    clearSessionAndRedirectExpired("Your session expired. Please login again.");
    throw new Error("Your session expired. Please login again.");
  }

  // Check JSON payload for explicit token failure keywords ("Invalid token", "JWT expired", "Unauthorized")
  const contentType = res.headers.get("content-type") || "";
  if (!res.ok && contentType.includes("application/json")) {
    const clone = res.clone();
    try {
      const body = await clone.json();
      const errMsg = (body.error || body.message || "").toString().toLowerCase();
      if (
        errMsg.includes("invalid token") ||
        errMsg.includes("jwt expired") ||
        errMsg.includes("unauthorized") ||
        errMsg.includes("session expired") ||
        errMsg.includes("token expired")
      ) {
        clearSessionAndRedirectExpired("Your session expired. Please login again.");
        throw new Error("Your session expired. Please login again.");
      }
    } catch (e) {
      // ignore JSON parse error
    }
  }

  return res;
}

