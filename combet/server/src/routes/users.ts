import { Router } from "express";
import { pool } from "../db";
import { requireAuth, AuthRequest } from "../middleware/auth";

export const usersRouter = Router();

// ─── Get My Profile ───────────────────────────────────────────────────────────
usersRouter.get("/me", requireAuth, async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        u.id, u.username, u.email, u.first_name, u.last_name, u.created_at,
        u.coins, u.bio, u.avatar_color, u.avatar_icon, u.is_private,
        (SELECT COUNT(*) FROM follows WHERE following_id = u.id) AS followers_count,
        (SELECT COUNT(*) FROM follows WHERE follower_id = u.id) AS following_count,
        (SELECT COUNT(*) FROM bets WHERE creator_user_id = u.id) AS total_bets,
        -- Wins: bets that are SETTLED where your selected option matched the winning option
        (SELECT COUNT(*)
         FROM bet_responses br
         JOIN bets b ON b.id = br.bet_id
         WHERE br.user_id = u.id
           AND br.status = 'accepted'
           AND b.status = 'SETTLED'
           AND br.selected_option_id = b.winning_option_id
        ) AS wins,
        -- Losses: bets that are SETTLED where your selected option did NOT match
        (SELECT COUNT(*)
         FROM bet_responses br
         JOIN bets b ON b.id = br.bet_id
         WHERE br.user_id = u.id
           AND br.status = 'accepted'
           AND b.status = 'SETTLED'
           AND br.selected_option_id <> b.winning_option_id
        ) AS losses
      FROM users u
      WHERE u.id = $1
      `,
      [req.userId]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: "User not found" });

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
      avatar_color:    user.avatar_color ?? "#2563eb",
      avatar_icon:     user.avatar_icon ?? "initials",
      is_private:      user.is_private ?? false,
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
usersRouter.patch("/me", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { display_name, bio, avatar_color, avatar_icon, is_private } = req.body;
    const parts      = (display_name ?? "").trim().split(/\s+/);
    const first_name = parts[0] ?? "";
    const last_name  = parts.slice(1).join(" ") ?? "";

    const result = await pool.query(
      `UPDATE users
       SET first_name = $1, last_name = $2, bio = $3,
           avatar_color = $4, avatar_icon = $5, is_private = $6
       WHERE id = $7
       RETURNING id, username, email, first_name, last_name, bio,
                 avatar_color, avatar_icon, coins, created_at, is_private`,
      [first_name, last_name, bio ?? "", avatar_color ?? "#2563eb",
       avatar_icon ?? "initials", is_private ?? false, req.userId]
    );

    const user = result.rows[0];
    res.json({
      id:           user.id,
      username:     user.username,
      email:        user.email,
      display_name: `${user.first_name} ${user.last_name}`.trim() || user.username,
      bio:          user.bio ?? "",
      avatar_color: user.avatar_color ?? "#2563eb",
      avatar_icon:  user.avatar_icon ?? "initials",
      is_private:   user.is_private ?? false,
      coins:        user.coins,
      created_at:   user.created_at,
    });
  } catch (err) {
    console.error("PATCH /users/me error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── Search Users & Circles ───────────────────────────────────────────────────
usersRouter.get("/search", requireAuth, async (req: AuthRequest, res) => {
  try {
    const q = String(req.query.q ?? "").trim();
    if (!q) return res.json([]);

    const result = await pool.query(
      `
      -- USERS
      SELECT
        'user' AS type,
        u.id::text AS id,
        COALESCE(NULLIF(TRIM(CONCAT_WS(' ', u.first_name, u.last_name)), ''), u.username) AS label,
        u.username AS subtitle,
        CASE WHEN f.follower_id IS NULL THEN false ELSE true END AS "isFriend",
        u.avatar_color,
        u.avatar_icon,
        u.is_private,
        -- follow request status if they're private and we've sent a request
        CASE
          WHEN u.is_private AND fr.status = 'pending' THEN 'requested'
          WHEN f.follower_id IS NOT NULL               THEN 'following'
          ELSE NULL
        END AS follow_status,
        NULL::text AS join_status,
        NULL::boolean AS is_private_circle,
        NULL::text AS icon,
        NULL::text AS icon_color
      FROM users u
      LEFT JOIN follows f        ON f.following_id = u.id AND f.follower_id = $1
      LEFT JOIN follow_requests fr
        ON fr.requestee_id = u.id AND fr.requester_id = $1 AND fr.status = 'pending'
      WHERE u.id <> $1
        AND (
          u.username ILIKE '%' || $2 || '%'
          OR COALESCE(u.first_name, '') ILIKE '%' || $2 || '%'
          OR COALESCE(u.last_name, '') ILIKE '%' || $2 || '%'
        )

      UNION ALL

      -- CIRCLES
      SELECT
        'circle' AS type,
        c.circle_id::text AS id,
        c.name AS label,
        COALESCE(c.description, '') AS subtitle,
        NULL::boolean AS "isFriend",
        NULL::text AS avatar_color,
        NULL::text AS avatar_icon,
        NULL::boolean AS is_private,
        NULL::text AS follow_status,
        CASE
          WHEN cm.status = 'accepted' THEN 'joined'
          WHEN cjr.status = 'pending' THEN 'pending'
          ELSE NULL
        END AS join_status,
        c.is_private AS is_private_circle,
        c.icon,
        c.icon_color
      FROM circles c
      LEFT JOIN circle_members cm
        ON cm.circle_id = c.circle_id AND cm.user_id = $1
      LEFT JOIN circle_join_requests cjr
        ON cjr.circle_id = c.circle_id AND cjr.user_id = $1 AND cjr.status = 'pending'
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

// ─── Follow / Request to Follow a User ───────────────────────────────────────
usersRouter.post("/follows", requireAuth, async (req: AuthRequest, res) => {
  const { followingId } = req.body;
  const currentUserId   = req.userId;

  if (!followingId)
    return res.status(400).json({ error: "followingId required" });
  if (followingId === currentUserId)
    return res.status(400).json({ error: "Cannot follow yourself" });

  try {
    // Check if target user has a private profile
    const targetUser = await pool.query(
      `SELECT is_private FROM users WHERE id = $1`,
      [followingId]
    );
    if (!targetUser.rows.length)
      return res.status(404).json({ error: "User not found" });

    const isPrivate = targetUser.rows[0].is_private;

    if (isPrivate) {
      // ── Private profile: create a follow request + notification ──
      const existing = await pool.query(
        `SELECT request_id FROM follow_requests
         WHERE requester_id = $1 AND requestee_id = $2`,
        [currentUserId, followingId]
      );
      if (existing.rows.length)
        return res.status(400).json({ error: "Follow request already sent" });

      const request = await pool.query(
        `INSERT INTO follow_requests (requester_id, requestee_id, status)
         VALUES ($1, $2, 'pending') RETURNING request_id`,
        [currentUserId, followingId]
      );
      const requestId = request.rows[0].request_id;

      await pool.query(
        `INSERT INTO notifications
           (recipient_id, actor_id, type, entity_type, entity_id)
         VALUES ($1, $2, 'follow_request', 'follow_request', $3)`,
        [followingId, currentUserId, requestId]
      );

      return res.json({ ok: true, status: "requested" });
    } else {
      // ── Public profile: follow directly ──
      await pool.query(
        `INSERT INTO follows (follower_id, following_id)
         VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [currentUserId, followingId]
      );
      return res.json({ ok: true, status: "following" });
    }
  } catch (err) {
    console.error("POST /users/follows error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── Get My Friends ───────────────────────────────────────────────────────────
usersRouter.get("/friends", requireAuth, async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.username, u.username AS name, u.avatar_color, u.avatar_icon,
         COALESCE(NULLIF(TRIM(CONCAT_WS(' ', u.first_name, u.last_name)), ''), u.username) AS display_name
       FROM follows f
       JOIN users u ON u.id = f.following_id
       WHERE f.follower_id = $1`,
      [req.userId as string]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("GET /users/friends error:", err);
    res.status(500).json({ error: "Server error" });
  }
});