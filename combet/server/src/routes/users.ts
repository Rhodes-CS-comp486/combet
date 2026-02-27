import { Router } from "express";
import { pool } from "../db";
import { requireAuth, AuthRequest } from "../middleware/auth";

export const usersRouter = Router();

// ─── Search Users & Circles ───────────────────────────────────────────────────
// GET /users/search?q=...
usersRouter.get("/search", requireAuth, async (req: AuthRequest, res) => {
  try {
    const q = String(req.query.q ?? "").trim();
    if (!q) return res.json([]);

    const result = await pool.query(
      `
      -- USERS
      SELECT
        'user'   AS type,
        u.id::text AS id,
        COALESCE(NULLIF(TRIM(CONCAT_WS(' ', u.first_name, u.last_name)), ''), u.username) AS label,
        u.username AS subtitle,
        CASE WHEN f.follower_id IS NULL THEN false ELSE true END AS "isFriend"
      FROM users u
      LEFT JOIN follows f
        ON f.following_id = u.id
        AND f.follower_id = $1
      WHERE u.id <> $1
        AND (
          u.username   ILIKE '%' || $2 || '%'
          OR COALESCE(u.first_name, '') ILIKE '%' || $2 || '%'
          OR COALESCE(u.last_name,  '') ILIKE '%' || $2 || '%'
        )

      UNION ALL

      -- CIRCLES
      SELECT
        'circle' AS type,
        c.circle_id::text AS id,
        c.name AS label,
        COALESCE(c.description, '') AS subtitle,
        NULL::boolean AS "isFriend"
      FROM circles c
      WHERE c.name ILIKE '%' || $2 || '%'

      ORDER BY label
      LIMIT 50
      `,
      [req.userId, q]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("GET /users/search error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── Follow a User ────────────────────────────────────────────────────────────
// POST /users/follows
usersRouter.post("/follows", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { followingId } = req.body;
    const currentUserId = req.userId;

    if (!followingId) return res.status(400).json({ error: "followingId required" });
    if (followingId === currentUserId)
      return res.status(400).json({ error: "Cannot follow yourself" });

    await pool.query(
      `
      INSERT INTO follows (follower_id, following_id)
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING
      `,
      [currentUserId, followingId]
    );

    res.json({ ok: true });
  } catch (err) {
    console.error("POST /users/follows error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── Get My Friends ───────────────────────────────────────────────────────────
// GET /users/friends
usersRouter.get("/friends", requireAuth, async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      `
      SELECT u.id, u.username AS name
      FROM follows f
      JOIN users u ON u.id = f.following_id
      WHERE f.follower_id = $1
      `,
      [req.userId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("GET /users/friends error:", err);
    res.status(500).json({ error: "Server error" });
  }
});