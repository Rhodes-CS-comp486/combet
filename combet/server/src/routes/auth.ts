import { Router } from "express";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { pool } from "../db";

export const authRouter = Router();

function makeSessionId() {
  return crypto.randomBytes(32).toString("base64url");
}

// Register
authRouter.post("/register", async (req, res) => {
  const { username, email, password, first_name, last_name } = req.body;

  if (!username || !email || !password) return res.status(400).send("Missing fields");

  const passwordHash = await bcrypt.hash(password, 10);

  try {
    const userResult = await pool.query(
      `
      INSERT INTO users (username, email, first_name, last_name, password_hash)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, username, email, first_name, last_name
      `,
      [username, email.toLowerCase(), first_name ?? null, last_name ?? null, passwordHash]
    );
    // includes uuid for user
    const newUser = userResult.rows[0];

    // makes session_id for each session
    // keeps track when users login/logout
    const sessionId = makeSessionId();
    await pool.query(
      `INSERT INTO sessions (session_id, username) VALUES ($1, $2)`,
      [sessionId, username]
    );

    return res.json({ session_id: sessionId, user: userResult.rows[0] });
  } catch (e: any) {
    return res.status(409).send("Username or email already exists");
  }
});

// Login
authRouter.post("/login", async (req, res) => {
  const { emailOrUsername, password } = req.body;
  if (!emailOrUsername || !password) return res.status(400).send("Missing fields");

  const result = await pool.query(
    `
    SELECT username, email, first_name, last_name, password_hash
    FROM users
    WHERE lower(email) = lower($1) OR username = $1
    LIMIT 1
    `,
    [emailOrUsername]
  );

  const user = result.rows[0];
  if (!user) return res.status(401).send("Invalid login");

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).send("Invalid login");

  const sessionId = makeSessionId();
  await pool.query(`INSERT INTO sessions (session_id, username) VALUES ($1, $2)`, [
    sessionId,
    user.username,
  ]);

  return res.json({
    session_id: sessionId,
    user: {
      username: user.username,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
    },
  });
});

// Current user (protected)
authRouter.get("/me", async (req, res) => {
  const sessionId = req.header("x-session-id");
  if (!sessionId) return res.status(401).send("Missing session");

  const result = await pool.query(
    `
    SELECT u.username, u.email, u.first_name, u.last_name
    FROM sessions s
    JOIN users u ON u.username = s.username
    WHERE s.session_id = $1
    `,
    [sessionId]
  );

// Logout
  const me = result.rows[0];
  if (!me) return res.status(401).send("Invalid session");
  return res.json(me);
});

authRouter.post("/logout", async (req, res) => {
  const sessionId = req.header("x-session-id");
  if (sessionId) {
    await pool.query("DELETE FROM sessions WHERE session_id = $1", [sessionId]);
  }
  return res.json({ ok: true });
});

