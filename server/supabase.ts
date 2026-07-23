import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * Ensures SUPABASE_URL contains ONLY protocol and hostname (https://YOUR_PROJECT_ID.supabase.co)
 * Removes any trailing slashes, /auth, /auth/v1, /rest/v1 or extra paths.
 */
export function formatSupabaseUrl(urlStr: string | undefined): string {
  if (!urlStr || !urlStr.trim()) return "https://placeholder-supabase.supabase.co";
  let url = urlStr.trim();
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = `https://${url}`;
  }
  try {
    const parsed = new URL(url);
    return parsed.origin;
  } catch (err) {
    let cleaned = url.replace(/\/(auth|rest)(\/v\d+)?.*$/i, "");
    cleaned = cleaned.replace(/\/+$/, "");
    return cleaned;
  }
}

const rawSupabaseUrl = process.env.SUPABASE_URL;
const supabaseUrl = formatSupabaseUrl(rawSupabaseUrl);
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || "placeholder-anon-key";

export const isSupabaseConfigured = !!(
  process.env.SUPABASE_URL && 
  (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY)
);

console.log("==================================================");
console.log("🔑 [Supabase Auth Initialization Status]");
console.log("  • Raw SUPABASE_URL env      :", rawSupabaseUrl || "(not defined)");
console.log("  • Sanitized SUPABASE_URL    :", supabaseUrl);
console.log("  • SUPABASE_ANON_KEY         :", process.env.SUPABASE_ANON_KEY ? "[SET]" : "[NOT SET]");
console.log("  • SUPABASE_SERVICE_ROLE_KEY :", process.env.SUPABASE_SERVICE_ROLE_KEY ? "[SET]" : "[NOT SET]");
console.log("  • JWT_SECRET                :", process.env.JWT_SECRET ? "[SET]" : "[NOT SET - Using default]");
console.log("  • isSupabaseConfigured      :", isSupabaseConfigured);
console.log("==================================================");

let supabaseClient: SupabaseClient;

try {
  supabaseClient = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  if (isSupabaseConfigured) {
    console.log(`⚡ [Supabase Auth Client] Initialized successfully with endpoint: ${supabaseUrl}`);
  } else {
    console.log("ℹ️  [Supabase Auth Client] Environment variables incomplete. Initialized fallback client.");
  }
} catch (err: any) {
  console.error("❌ [Supabase Auth Client] Error initializing createClient:", err.message);
  supabaseClient = createClient("https://placeholder-supabase.supabase.co", "placeholder-key");
}

export async function ensureStorageBucket(bucketName: string = "album-photos") {
  if (!isSupabaseConfigured || !supabaseClient) return;
  try {
    const { data: buckets } = await supabaseClient.storage.listBuckets();
    const exists = buckets?.some((b) => b.name === bucketName);
    if (!exists) {
      const { error } = await supabaseClient.storage.createBucket(bucketName, {
        public: true,
        fileSizeLimit: 200 * 1024 * 1024,
      });
      if (!error) {
        console.log(`✅ [Supabase Storage] Bucket '${bucketName}' initialized and set to public.`);
      }
    }
  } catch (err: any) {
    console.warn("[Supabase Storage Notice]:", err.message);
  }
}

// Auto run bucket check
ensureStorageBucket("album-photos").catch(() => {});
ensureStorageBucket("proofing-images").catch(() => {});
ensureStorageBucket("proofing-thumbnails").catch(() => {});

export { supabaseClient };

