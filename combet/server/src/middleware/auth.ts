import { Request, Response, NextFunction } from "express";
import { pool } from "../db";

// Extends Express Request so route handlers can read req.userId
export interface AuthRequest extends Request {
  userId?: string;
}

/**
 * Checks the "x-session-id" or "session-id" header, looks up the user,
 * and attaches req.userId.  Responds 401 if session is missing or invalid.
 */
export async function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const sessionId =
    req.header("x-session-id") ||
    (req.headers["session-id"] as string | undefined);

  if (!sessionId) {
    return res.status(401).json({ error: "Missing session" });
  }

  try {
    const result = await pool.query(
      `
      SELECT u.id
      FROM sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.session_id = $1
      `,
      [sessionId]
    );

    if (!result.rows.length) {
      return res.status(401).json({ error: "Invalid session" });
    }

    req.userId = result.rows[0].id;
    next();
  } catch (err) {
    console.error("requireAuth error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}