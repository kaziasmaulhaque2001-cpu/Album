import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { sessionDb } from "./supabaseDb.js";

const JWT_SECRET = process.env.JWT_SECRET || "wedding-photo-selection-secret-key-2026";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

export async function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Access denied. No authentication token provided.", code: "NO_TOKEN" });
    return;
  }

  const token = authHeader.split(" ")[1];

  if (!token || token === "null" || token === "undefined") {
    res.status(401).json({ error: "Access denied. Invalid token format.", code: "NO_TOKEN" });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: string;
      email: string;
      name: string;
      role: string;
      exp?: number;
    };

    // Check session in Supabase / Memory store
    const session = await sessionDb.findByToken(token);

    if (!session) {
      // If valid signed JWT is provided but session memory was reset, auto-register active session
      const expiresAt = decoded.exp ? new Date(decoded.exp * 1000) : new Date(Date.now() + 7 * 24 * 3600 * 1000);
      if (expiresAt > new Date()) {
        await sessionDb.create({
          userId: decoded.id || "admin-default",
          token,
          expiresAt,
        }).catch(() => {});
        req.user = decoded;
        next();
        return;
      } else {
        res.status(401).json({ error: "Session has expired. Please log in again.", code: "TOKEN_EXPIRED" });
        return;
      }
    }

    if (new Date() > new Date(session.expiresAt)) {
      await sessionDb.deleteByToken(token).catch(() => {});
      res.status(401).json({ error: "Session has expired. Please log in again.", code: "TOKEN_EXPIRED" });
      return;
    }

    req.user = decoded;
    next();
  } catch (error: any) {
    if (error.name === "TokenExpiredError") {
      res.status(401).json({ error: "Token has expired. Please log in again.", code: "TOKEN_EXPIRED" });
    } else {
      res.status(401).json({ error: "Invalid or expired token.", code: "INVALID_TOKEN" });
    }
  }
}

export function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user || req.user.role !== "ADMIN") {
    res.status(403).json({ error: "Access denied. Admin role required." });
    return;
  }
  next();
}
