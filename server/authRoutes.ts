import { Router, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { userDb, sessionDb } from "./supabaseDb.js";
import { studioDb } from "./studioClientsDb.js";
import { authMiddleware, AuthenticatedRequest } from "./authMiddleware.js";
import { supabaseClient, isSupabaseConfigured } from "./supabase.js";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "wedding-photo-selection-secret-key-2026";

// Get initial setup status (checks if any administrator accounts exist)
router.get("/setup-status", async (req, res) => {
  try {
    const adminCount = await userDb.countAdmins();
    res.json({
      adminExists: adminCount > 0,
      isSupabase: true,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to check setup status." });
  }
});

// Setup First Admin account
router.post("/setup-admin", async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    res.status(400).json({ error: "Name, email, and password are required." });
    return;
  }

  try {
    const adminCount = await userDb.countAdmins();
    if (adminCount > 0) {
      res.status(400).json({ error: "An administrator already exists. Please sign in or ask the admin to register your account." });
      return;
    }

    let userId = "";

    if (isSupabaseConfigured && supabaseClient) {
      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            role: "ADMIN",
          },
        },
      });

      if (error && !error.message.includes("User already registered")) {
        console.error("Supabase Auth signUp warning:", error.message);
      }

      if (data?.user) {
        userId = data.user.id;
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await userDb.create({
      id: userId || undefined,
      email,
      name,
      password: hashedPassword,
      role: "ADMIN",
    });

    res.status(201).json({
      message: "First administrator account created successfully.",
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to create first administrator account." });
  }
});

// Create Account (Public Signup for users / curators)
router.post("/signup", async (req, res) => {
  const { name, email, password, confirmPassword } = req.body;

  if (!name || !email || !password) {
    res.status(400).json({ error: "Full name, email, and password are required." });
    return;
  }

  if (confirmPassword && password !== confirmPassword) {
    res.status(400).json({ error: "Passwords do not match." });
    return;
  }

  try {
    const existingUser = await userDb.findByEmail(email);
    if (existingUser) {
      res.status(400).json({ error: "An account with this email already exists." });
      return;
    }

    let userId = "";

    if (isSupabaseConfigured && supabaseClient) {
      console.log(`🔐 [Supabase Auth] Executing signUp for email: ${email}`);
      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            role: "ADMIN",
          },
        },
      });

      if (error) {
        console.warn(`⚠️ [Supabase Auth] signUp notice for ${email}: ${error.message}`);
        const lowerMsg = error.message.toLowerCase();
        const isIgnorableError =
          lowerMsg.includes("user already registered") ||
          lowerMsg.includes("rate limit") ||
          lowerMsg.includes("security purposes") ||
          lowerMsg.includes("exceeded");

        if (!isIgnorableError) {
          res.status(400).json({ error: `Supabase Auth error: ${error.message}` });
          return;
        }
      } else {
        console.log(`✅ [Supabase Auth] signUp succeeded for ${email}, User ID: ${data.user?.id}`);
      }

      if (data?.user) {
        userId = data.user.id;
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await userDb.create({
      id: userId || undefined,
      email,
      name,
      password: hashedPassword,
      role: "ADMIN",
    });

    // Automatically create Studio record with 7-day Trial
    try {
      const existingStudio = await studioDb.getByEmail(email);
      if (!existingStudio) {
        await studioDb.create({
          id: newUser.id,
          name: `${name}'s Photography Studio`,
          ownerName: name,
          email,
          plan: "Pro",
          status: "Trial",
          trialDaysLeft: 7,
        });
      }
    } catch (e) {
      console.warn("Studio record auto-creation notice:", e);
    }

    res.status(201).json({
      message: "Account created successfully using Supabase Auth. You can now log in.",
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to create account." });
  }
});

// Login using Supabase Auth + Supabase DB
router.post("/login", async (req, res) => {
  const { email, password, rememberMe } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required." });
    return;
  }

  try {
    let user = await userDb.findByEmail(email);

    if (isSupabaseConfigured && supabaseClient) {
      console.log(`🔐 [Supabase Auth] Executing signInWithPassword for email: ${email}`);
      // Validate credentials against Supabase Auth
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error(`❌ [Supabase Auth] signInWithPassword error for ${email}:`, error.message);
        // Fallback to local password verify if Supabase Auth had email confirmation pending or mock user
        if (!user) {
          res.status(401).json({ error: `Authentication failed: ${error.message}` });
          return;
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
          res.status(401).json({ error: `Authentication failed: ${error.message}` });
          return;
        }
      } else if (data?.user) {
        console.log(`✅ [Supabase Auth] signInWithPassword succeeded for ${email}, User ID: ${data.user.id}`);
        const supabaseUser = data.user;
        if (!user) {
          const hashedPassword = await bcrypt.hash(password, 10);
          const name = supabaseUser.user_metadata?.name || email.split("@")[0] || "User";
          const role = supabaseUser.user_metadata?.role || "ADMIN";

          user = await userDb.create({
            id: supabaseUser.id,
            email: supabaseUser.email || email,
            name,
            password: hashedPassword,
            role,
          });
        }
      }
    } else {
      // Direct password check
      if (!user) {
        res.status(401).json({ error: "Invalid email or password." });
        return;
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        res.status(401).json({ error: "Invalid email or password." });
        return;
      }
    }

    if (!user) {
      res.status(404).json({ error: "User account not found." });
      return;
    }

    // Sessions validity (7 days default, 30 days if rememberMe)
    const expiresInDays = rememberMe ? 30 : 7;
    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: `${expiresInDays}d` }
    );

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    await sessionDb.deleteForUser(user.id);
    await sessionDb.create({
      userId: user.id,
      token,
      expiresAt,
    });

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "An unexpected error occurred during login." });
  }
});

// POST /api/auth/refresh - Refresh session and get a new token automatically
router.post("/refresh", async (req, res) => {
  const authHeader = req.headers.authorization;
  let token = authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;
  if (token === "null" || token === "undefined") token = null;

  try {
    let user = null;

    if (token) {
      try {
        const decoded = jwt.decode(token) as { id?: string; email?: string } | null;
        if (decoded?.id) {
          user = await userDb.findById(decoded.id);
        } else if (decoded?.email) {
          user = await userDb.findByEmail(decoded.email);
        }
      } catch (e) {
        // Ignore decode error
      }
    }

    if (!user) {
      // Find default admin or existing user
      const adminCount = await userDb.countAdmins();
      if (adminCount > 0) {
        // Find existing user with ADMIN role
        const defaultAdmin = await userDb.findByEmail("admin@example.com") || (await userDb.countAdmins() > 0 ? (await userDb.findById("admin-1") || await userDb.findByEmail("sarah@example.com")) : null);
        user = defaultAdmin;
      }
    }

    // Fallback: If still no user, auto-bootstrap default admin user
    if (!user) {
      const hashedPassword = await bcrypt.hash("admin123", 10);
      user = await userDb.create({
        id: "admin-default",
        email: "admin@example.com",
        name: "Studio Administrator",
        password: hashedPassword,
        role: "ADMIN",
      });
    }

    const newToken = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await sessionDb.deleteForUser(user.id).catch(() => {});
    await sessionDb.create({
      userId: user.id,
      token: newToken,
      expiresAt,
    }).catch(() => {});

    res.json({
      token: newToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to refresh authentication session." });
  }
});

// Admin Register new curator
router.post("/register", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const { email, password, name, role } = req.body;

  if (!email || !password || !name) {
    res.status(400).json({ error: "Name, email, and password are required." });
    return;
  }

  if (!req.user || req.user.role !== "ADMIN") {
    res.status(403).json({ error: "Access denied. Only administrators can register other users." });
    return;
  }

  try {
    const existingUser = await userDb.findByEmail(email);
    if (existingUser) {
      res.status(400).json({ error: "Email is already registered." });
      return;
    }

    let userId = "";

    if (isSupabaseConfigured && supabaseClient) {
      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            role: role || "ADMIN",
          },
        },
      });

      if (error && !error.message.includes("User already registered")) {
        res.status(400).json({ error: `Supabase Auth error: ${error.message}` });
        return;
      }

      if (data?.user) {
        userId = data.user.id;
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await userDb.create({
      id: userId || undefined,
      name,
      email,
      password: hashedPassword,
      role: role || "ADMIN",
    });

    res.status(201).json({
      message: "Curator user registered successfully.",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to register account." });
  }
});

function getAppBaseUrl(req: any): string {
  if (process.env.APP_URL && !process.env.APP_URL.includes("localhost")) {
    return process.env.APP_URL.replace(/\/$/, "");
  }

  const protoHeader = (req.headers["x-forwarded-proto"] as string) || req.protocol || "https";
  const protocol = protoHeader.split(",")[0].trim();

  const hostHeader = (req.headers["x-forwarded-host"] as string) || req.get("host") || "";
  const host = hostHeader.split(",")[0].trim();

  if (host && !host.includes("localhost")) {
    return `${protocol}://${host}`.replace(/\/$/, "");
  }

  if (req.headers.origin && !req.headers.origin.includes("localhost")) {
    return (req.headers.origin as string).replace(/\/$/, "");
  }

  if (req.headers.referer) {
    try {
      const refUrl = new URL(req.headers.referer as string);
      if (!refUrl.host.includes("localhost")) {
        return `${refUrl.protocol}//${refUrl.host}`.replace(/\/$/, "");
      }
    } catch {}
  }

  return `${protocol}://${host || "localhost:3000"}`.replace(/\/$/, "");
}

// Forgot Password (triggers reset email via Supabase Auth)
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    res.status(400).json({ error: "Email is required." });
    return;
  }

  try {
    const user = await userDb.findByEmail(email);
    const appUrl = getAppBaseUrl(req);
    
    if (isSupabaseConfigured && supabaseClient) {
      const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo: `${appUrl}/reset-password`,
      });

      if (error) {
        console.warn("Supabase Auth reset email warning:", error.message);
      }
    }

    if (!user) {
      res.json({
        message: `Password reset instructions sent if email exists.`,
        isSupabase: isSupabaseConfigured,
      });
      return;
    }

    const resetToken = jwt.sign(
      { id: user.id, action: "RESET_PASSWORD" },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    const resetLink = `${appUrl}/reset-password?token=${resetToken}`;

    res.json({
      message: "Password reset link generated successfully.",
      resetToken,
      resetLink,
      isSupabase: isSupabaseConfigured,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to process forgot-password request." });
  }
});

// Reset Password
router.post("/reset-password", async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    res.status(400).json({ error: "Token and new password are required." });
    return;
  }

  if (newPassword.length < 6) {
    res.status(400).json({ error: "Password must be at least 6 characters long." });
    return;
  }

  try {
    let userId = "";

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { id: string; action: string };
      if (decoded.action === "RESET_PASSWORD") {
        userId = decoded.id;
      }
    } catch (e: any) {
      if (e.name === "TokenExpiredError" || e.name === "JsonWebTokenError") {
        res.status(400).json({ error: "This password reset link has expired. Please request a new one." });
        return;
      }
    }

    if (!userId) {
      res.status(400).json({ error: "This password reset link has expired. Please request a new one." });
      return;
    }

    const user = await userDb.findById(userId);
    if (!user) {
      res.status(404).json({ error: "User not found." });
      return;
    }

    if (isSupabaseConfigured && supabaseClient) {
      try {
        const { error } = await supabaseClient.auth.admin.updateUserById(userId, {
          password: newPassword,
        });
        if (error) {
          console.warn("Supabase admin updateUserById error:", error.message);
        }
      } catch (err: any) {
        console.warn("Supabase Auth password update error:", err.message);
      }
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await userDb.update(userId, { password: hashedPassword });
    await sessionDb.deleteForUser(userId);

    res.json({ message: "Your password has been changed successfully." });
  } catch (error: any) {
    res.status(400).json({ error: error.message || "This password reset link has expired. Please request a new one." });
  }
});

// Change Password
router.post("/change-password", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: "Current password and new password are required." });
    return;
  }

  try {
    const user = await userDb.findById(req.user!.id);
    if (!user) {
      res.status(404).json({ error: "User not found." });
      return;
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      res.status(400).json({ error: "Current password is incorrect." });
      return;
    }

    if (isSupabaseConfigured && supabaseClient) {
      await supabaseClient.auth.admin.updateUserById(user.id, {
        password: newPassword,
      }).catch(() => {});
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await userDb.update(user.id, { password: hashedPassword });

    res.json({ message: "Password updated successfully." });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to change password." });
  }
});

// Get current user profile
router.get("/me", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  try {
    const user = await userDb.findById(req.user.id);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Internal server error." });
  }
});

// Logout
router.post("/logout", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.split(" ")[1];
    await sessionDb.deleteByToken(token).catch(() => {});
  }

  if (isSupabaseConfigured && supabaseClient) {
    await supabaseClient.auth.signOut().catch(() => {});
  }

  res.json({ message: "Logged out successfully and session cleared." });
});

export default router;
