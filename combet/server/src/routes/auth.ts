import { Router } from "express";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { pool } from "../db";
import { requireAuth, AuthRequest } from "../middleware/auth";

export const authRouter = Router();

function makeSessionId() {
  return crypto.randomBytes(32).toString("base64url");
}

// ─── Register ────────────────────────────────────────────────────────────────
authRouter.post("/register", async (req, res) => {
  const { username, email, password, first_name, last_name } = req.body;

  if (!username || !email || !password || !first_name || !last_name) {
    return res.status(400).send("Missing fields");
  }

  const passwordHash = await bcrypt.hash(password, 10);

  try {
    const userResult = await pool.query(
      `
      INSERT INTO users (username, email, first_name, last_name, password_hash)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, username, email, first_name, last_name
      `,
      [
        username.trim(),
        email.trim().toLowerCase(),
        first_name.trim(),
        last_name.trim(),
        passwordHash,
      ]
    );

    const newUser = userResult.rows[0];
    const sessionId = makeSessionId();

    await pool.query(
      `INSERT INTO sessions (session_id, user_id) VALUES ($1, $2)`,
      [sessionId, newUser.id]
    );

    return res.json({ session_id: sessionId, user: newUser });
  } catch (e: any) {
    // Only return "already exists" for real unique violations
    if (e?.code === "23505") {
      return res.status(409).send("Username or email already exists");
    }
    console.error("REGISTER ERROR:", e);
    return res.status(500).send(e?.detail || e?.message || "Server error");
  }
});

// ─── Login ───────────────────────────────────────────────────────────────────
authRouter.post("/login", async (req, res) => {
  console.log("LOGIN BODY:", req.body);
  const { emailOrUsername, password } = req.body;
  const identifier = emailOrUsername?.trim().toLowerCase();

    try {
    const result = await pool.query(
      `
      SELECT * FROM users
      WHERE LOWER(email) = $1
         OR LOWER(username) = $1
      LIMIT 1
      `,
      [identifier]  // ← this uses it
    );

    const user = result.rows[0];
    if (!user) return res.status(401).send("Invalid credentials");

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).send("Invalid credentials");

    const sessionId = makeSessionId();
    await pool.query(
      `INSERT INTO sessions (session_id, user_id) VALUES ($1, $2)`,
      [sessionId, user.id]
    );

    return res.json({
      session_id: sessionId,
      user: {
        id:         user.id,
        username:   user.username,
        email:      user.email,
        first_name: user.first_name,
        last_name:  user.last_name,
      },
    });
  } catch (e: any) {
    console.error("LOGIN ERROR:", e);
    return res.status(500).send(e?.detail || e?.message || "Server error");
  }
});

// ─── Current User (protected) ─────────────────────────────────────────────────
authRouter.get("/me", requireAuth, async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      `
      SELECT u.id, u.username, u.email, u.first_name, u.last_name
      FROM users u
      WHERE u.id = $1
      `,
      [req.userId]
    );

    const me = result.rows[0];
    if (!me) return res.status(401).send("Invalid session");
    return res.json(me);
  } catch (e: any) {
    console.error("ME ERROR:", e);
    return res.status(500).send(e?.detail || e?.message || "Server error");
  }
});

// ─── Logout ───────────────────────────────────────────────────────────────────
authRouter.post("/logout", async (req, res) => {
  const sessionId = req.header("x-session-id");
  if (!sessionId) return res.status(200).json({ ok: true });

  try {
    await pool.query("DELETE FROM sessions WHERE session_id = $1", [sessionId]);
    return res.json({ ok: true });
  } catch (e: any) {
    console.error("LOGOUT ERROR:", e);
    return res.status(500).send(e?.detail || e?.message || "Server error");
  }
});