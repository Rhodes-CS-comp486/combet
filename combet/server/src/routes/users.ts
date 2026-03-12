import { Router } from "express";
import { pool } from "../db";
import { requireAuth, AuthRequest } from "../middleware/auth";

export const usersRouter = Router();

// ─── Get My Profile ───────────────────────────────────────────────────────────
// GET /users/me
usersRouter.get("/me", requireAuth, async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        u.id,
        u.username,
        u.email,
        u.first_name,
        u.last_name,
        u.created_at,
        u.coins,
        u.bio,

        -- followers count
        (SELECT COUNT(*) FROM follows WHERE following_id = u.id) AS followers_count,

        -- following count
        (SELECT COUNT(*) FROM follows WHERE follower_id = u.id) AS following_count,

        -- total bets created
        (SELECT COUNT(*) FROM bets WHERE creator_user_id = u.id) AS total_bets,

        -- wins (accepted bet responses)
        (SELECT COUNT(*) FROM bet_responses WHERE user_id = u.id AND status = 'accepted') AS wins,

        -- losses (declined bet responses)
        (SELECT COUNT(*) FROM bet_responses WHERE user_id = u.id AND status = 'declined') AS losses

      FROM users u
      WHERE u.id = $1
      `,
      [req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = result.rows[0];

    res.json({
      id:              user.id,
      username:        user.username,
      email:           user.email,
      display_name:    user.first_name && user.last_name
                         ? `${user.first_name} ${user.last_name}`.trim()
                         : user.username,
      coins:           user.coins,
      bio:             user.bio ?? "",
      created_at:      user.created_at,
      followers_count: Number(user.followers_count),
      following_count: Number(user.following_count),
      total_bets:      Number(user.total_bets),
      wins:            Number(user.wins),
      losses:          Number(user.losses),
    });
  } catch (err) {
    console.error("GET /users/me error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── Update My Profile ────────────────────────────────────────────────────────
// PATCH /users/me
usersRouter.patch("/me", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { display_name, bio } = req.body;

    // split display_name into first/last
    const parts = (display_name ?? "").trim().split(/\s+/);
    const first_name = parts[0] ?? "";
    const last_name  = parts.slice(1).join(" ") ?? "";

    const result = await pool.query(
      `
      UPDATE users
      SET first_name = $1, last_name = $2, bio = $3
        WHERE id = $4
      RETURNING id, username, email, first_name, last_name, bio, coins, created_at
      `,
      [first_name, last_name, bio ?? "", req.userId]
    );

    const user = result.rows[0];

    res.json({
      id:           user.id,
      username:     user.username,
      email:        user.email,
      display_name: `${user.first_name} ${user.last_name}`.trim() || user.username,
      bio:          user.bio ?? "",
      coins:        user.coins,
      created_at:   user.created_at,
    });
  } catch (err) {
    console.error("PATCH /users/me error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

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