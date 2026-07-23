import { createClient, SupabaseClient, Session } from "@supabase/supabase-js";
import { getSupabaseUploadConfig } from "./supabaseUploader.js";

let clientInstance: SupabaseClient | null = null;

export async function getBrowserSupabase(): Promise<SupabaseClient | null> {
  if (clientInstance) return clientInstance;

  try {
    const config = await getSupabaseUploadConfig();
    if (config.isSupabaseConfigured && config.supabaseUrl && config.supabaseAnonKey) {
      let cleanUrl = config.supabaseUrl.trim();
      if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
        cleanUrl = `https://${cleanUrl}`;
      }
      try {
        cleanUrl = new URL(cleanUrl).origin;
      } catch (e) {
        cleanUrl = cleanUrl.replace(/\/(auth|rest)(\/v\d+)?.*$/i, "").replace(/\/+$/, "");
      }

      clientInstance = createClient(cleanUrl, config.supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      });
      return clientInstance;
    }
  } catch (e) {
    console.warn("Failed to initialize browser Supabase client:", e);
  }
  return null;
}

export function getBrowserSupabaseSync(url?: string, key?: string): SupabaseClient | null {
  if (clientInstance) return clientInstance;
  if (!url || !key) return null;

  let cleanUrl = url.trim();
  if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
    cleanUrl = `https://${cleanUrl}`;
  }
  try {
    cleanUrl = new URL(cleanUrl).origin;
  } catch (e) {
    cleanUrl = cleanUrl.replace(/\/(auth|rest)(\/v\d+)?.*$/i, "").replace(/\/+$/, "");
  }

  clientInstance = createClient(cleanUrl, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return clientInstance;
}
