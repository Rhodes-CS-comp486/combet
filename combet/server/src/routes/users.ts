import { Router } from "express";
import { pool } from "../db";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { userWantsNotification } from "./notificationPrefs";

export const usersRouter = Router();

// ─── Get My Profile ───────────────────────────────────────────────────────────
usersRouter.get("/me", requireAuth, async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        u.id, u.username, u.email, u.first_name, u.last_name, u.created_at,
        u.coins, u.bio, u.avatar_color, u.avatar_icon, u.is_private, u.is_admin,
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
      is_admin:        user.is_admin ?? false,
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
    const { display_name, bio, avatar_color, avatar_icon, is_private, show_bets_to_followers} = req.body;
    const parts      = (display_name ?? "").trim().split(/\s+/);
    const first_name = parts[0] ?? "";
    const last_name  = parts.slice(1).join(" ") ?? "";

    const result = await pool.query(
      `UPDATE users
       SET first_name            = COALESCE($1, first_name),
           last_name             = COALESCE($2, last_name),
           bio                   = COALESCE($3, bio),
           avatar_color          = COALESCE($4, avatar_color),
           avatar_icon           = COALESCE($5, avatar_icon),
           is_private            = COALESCE($6, is_private),
           show_bets_to_followers = COALESCE($7, show_bets_to_followers)
       WHERE id = $8
       RETURNING id, username, email, first_name, last_name, bio,
                 avatar_color, avatar_icon, coins, created_at, is_private, show_bets_to_followers`,
      [
        first_name || null,
        last_name  || null,
        bio        ?? null,
        avatar_color          ?? null,
        avatar_icon           ?? null,
        is_private            ?? null,
        show_bets_to_followers ?? null,
        req.userId,
      ]
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
      show_bets_to_followers: user.show_bets_to_followers ?? false,
      coins:        user.coins,
      created_at:   user.created_at,
    });
  } catch (err) {
    console.error("PATCH /users/me error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── Delete My Account ────────────────────────────────────────────────────────
usersRouter.delete("/me", requireAuth, async (req: AuthRequest, res) => {

      console.log("DELETE /users/me hit for user:", req.userId);

    const userId = req.userId;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query(`DELETE FROM blocks              WHERE blocker_id = $1 OR blocked_id = $1`,   [userId]);
    await client.query(`DELETE FROM reports             WHERE reporter_id = $1`,                      [userId]);
    await client.query(`DELETE FROM follows             WHERE follower_id = $1 OR following_id = $1`, [userId]);
    await client.query(`DELETE FROM follow_requests     WHERE requester_id = $1 OR requestee_id = $1`,[userId]);
    await client.query(`DELETE FROM circle_join_requests WHERE user_id = $1`,                         [userId]);
    await client.query(`DELETE FROM circle_members      WHERE user_id = $1`,                          [userId]);
    await client.query(`DELETE FROM bet_responses       WHERE user_id = $1`,                          [userId]);
    await client.query(`DELETE FROM coin_transactions   WHERE user_id = $1`,                          [userId]);
    await client.query(`DELETE FROM sessions            WHERE user_id = $1`,                          [userId]);
    await client.query(`DELETE FROM users               WHERE id = $1`,                               [userId]);

    await client.query("COMMIT");
    res.json({ ok: true });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("DELETE /users/me error:", err);
    res.status(500).json({ error: "Server error" });
  } finally {
    client.release();
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
          `SELECT request_id, status FROM follow_requests
           WHERE requester_id = $1 AND requestee_id = $2`,
          [currentUserId, followingId]
        );
        console.log("existing follow_requests rows:", existing.rows);
        if (existing.rows.length) {
          const { request_id, status } = existing.rows[0];
          console.log("found existing row, status:", status);
          if (status === 'pending')
            return res.json({ ok: true, status: "requested" });
          // For 'accepted' or 'declined', delete the old row and allow a fresh request
          await pool.query(
            `DELETE FROM follow_requests WHERE request_id = $1`,
            [request_id]
          );
        }
      const request = await pool.query(
        `INSERT INTO follow_requests (requester_id, requestee_id, status)
         VALUES ($1, $2, 'pending') RETURNING request_id`,
        [currentUserId, followingId]
      );
      const requestId = request.rows[0].request_id;

      if (await userWantsNotification(followingId, "notify_follow_request")) {
        await pool.query(
          `INSERT INTO notifications
             (recipient_id, actor_id, type, entity_type, entity_id)
           VALUES ($1, $2, 'follow_request', 'follow_request', $3)`,
          [followingId, currentUserId, requestId]
        );
      }

      return res.json({ ok: true, status: "requested" });
    } else {
      // ── Public profile: follow directly ──
      const followResult = await pool.query(
        `INSERT INTO follows (follower_id, following_id)
         VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING follower_id`,
        [currentUserId, followingId]
      );
      // Only notify if this was a new follow (not a duplicate)
      if (followResult.rows.length) {
        if (await userWantsNotification(followingId, "notify_new_follower")) {
          await pool.query(
            `INSERT INTO notifications (recipient_id, actor_id, type, entity_type, entity_id, is_read, created_at)
             VALUES ($1, $2, 'new_follower', 'user', $2, false, NOW())`,
            [followingId, currentUserId]
          );
        }
      }
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

// GET /users/me/followers
usersRouter.get("/me/followers", requireAuth, async (req: AuthRequest, res) => {
  const result = await pool.query(
    `SELECT
       u.id, u.username, u.is_private,
       COALESCE(NULLIF(TRIM(CONCAT_WS(' ', u.first_name, u.last_name)), ''), u.username) AS display_name,
       u.avatar_color, u.avatar_icon,
       EXISTS (
         SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = u.id
       ) AS is_following_back,
       EXISTS (
         SELECT 1 FROM follow_requests WHERE requester_id = $1 AND requestee_id = u.id AND status = 'pending'
       ) AS follow_requested
     FROM follows f
     JOIN users u ON u.id = f.follower_id
     WHERE f.following_id = $1
     ORDER BY u.username`,
    [req.userId]
  );
  res.json(result.rows);
});

// GET /users/me/following
usersRouter.get("/me/following", requireAuth, async (req: AuthRequest, res) => {

  const result = await pool.query(
    `SELECT u.id, u.username,
       COALESCE(NULLIF(TRIM(CONCAT_WS(' ', u.first_name, u.last_name)), ''), u.username) AS display_name,
       u.avatar_color, u.avatar_icon
     FROM follows f JOIN users u ON u.id = f.following_id
     WHERE f.follower_id = $1 ORDER BY u.username`,
    [req.userId]
  );
  res.json(result.rows);
});

// ─── Unfollow a User ──────────────────────────────────────────────────────────
usersRouter.delete("/follows/:userId", requireAuth, async (req: AuthRequest, res) => {
  const { userId } = req.params;
  const currentUserId = req.userId;
  try {
    await pool.query(
      `DELETE FROM follows WHERE follower_id = $1 AND following_id = $2`,
      [currentUserId, userId]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error("DELETE /users/follows/:userId error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── Another user's followers list ───────────────────────────────────────────
usersRouter.get("/:userId/followers", requireAuth, async (req: AuthRequest, res) => {
  const { userId }    = req.params;
  const currentUserId = req.userId;
  try {
    // Only allowed if public OR current user is following them
    const access = await pool.query(
      `SELECT is_private,
              EXISTS (SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = $2) AS is_following
       FROM users WHERE id = $2`,
      [currentUserId, userId]
    );
    const { is_private, is_following } = access.rows[0] ?? {};
    if (is_private && !is_following)
      return res.status(403).json({ error: "This account is private" });

    const result = await pool.query(
      `SELECT
         u.id, u.username, u.is_private,
         COALESCE(NULLIF(TRIM(CONCAT_WS(' ', u.first_name, u.last_name)), ''), u.username) AS display_name,
         u.avatar_color, u.avatar_icon,
         EXISTS (
           SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = u.id
         ) AS is_following_back,
         EXISTS (
           SELECT 1 FROM follow_requests
           WHERE requester_id = $1 AND requestee_id = u.id AND status = 'pending'
         ) AS follow_requested
       FROM follows f
       JOIN users u ON u.id = f.follower_id
       WHERE f.following_id = $2
       ORDER BY u.username`,
      [currentUserId, userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("GET /users/:userId/followers error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── Another user's following list ───────────────────────────────────────────
usersRouter.get("/:userId/following", requireAuth, async (req: AuthRequest, res) => {
  const { userId }    = req.params;
  const currentUserId = req.userId;
  try {
    const access = await pool.query(
      `SELECT is_private,
              EXISTS (SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = $2) AS is_following
       FROM users WHERE id = $2`,
      [currentUserId, userId]
    );
    const { is_private, is_following } = access.rows[0] ?? {};
    if (is_private && !is_following)
      return res.status(403).json({ error: "This account is private" });

    const result = await pool.query(
      `SELECT
         u.id, u.username, u.is_private,
         COALESCE(NULLIF(TRIM(CONCAT_WS(' ', u.first_name, u.last_name)), ''), u.username) AS display_name,
         u.avatar_color, u.avatar_icon,
         EXISTS (
           SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = u.id
         ) AS is_following_back,
         EXISTS (
           SELECT 1 FROM follow_requests
           WHERE requester_id = $1 AND requestee_id = u.id AND status = 'pending'
         ) AS follow_requested
       FROM follows f
       JOIN users u ON u.id = f.following_id
       WHERE f.follower_id = $2
       ORDER BY u.username`,
      [currentUserId, userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("GET /users/:userId/following error:", err);
    res.status(500).json({ error: "Server error" });
  }
});


// ─── Get My Block List ────────────────────────────────────────────────────────
usersRouter.get("/blocked", requireAuth, async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.username,
         COALESCE(NULLIF(TRIM(CONCAT_WS(' ', u.first_name, u.last_name)), ''), u.username) AS display_name,
         u.avatar_color, u.avatar_icon
       FROM blocks b
       JOIN users u ON u.id = b.blocked_id
       WHERE b.blocker_id = $1
       ORDER BY b.created_at DESC`,
      [req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("GET /users/blocked error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── Save Push Token ──────────────────────────────────────────────────────────
usersRouter.post("/me/push-token", requireAuth, async (req: AuthRequest, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: "Token required" });
  try {
    await pool.query(
      `UPDATE users SET push_token = $1 WHERE id = $2`,
      [token, req.userId]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error("POST /users/me/push-token error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── Clear Push Token (on logout) ─────────────────────────────────────────────
usersRouter.delete("/me/push-token", requireAuth, async (req: AuthRequest, res) => {
  try {
    await pool.query(`UPDATE users SET push_token = NULL WHERE id = $1`, [req.userId]);
    res.json({ ok: true });
  } catch (err) {
    console.error("DELETE /users/me/push-token error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── Get Another User's Profile ───────────────────────────────────────────────
usersRouter.get("/:userId", requireAuth, async (req: AuthRequest, res) => {
  const { userId } = req.params;
  const currentUserId = req.userId;

  try {
    // Get target user profile
    const userResult = await pool.query(
      `SELECT u.id, u.username, u.first_name, u.last_name, u.bio,
              u.avatar_color, u.avatar_icon, u.is_private, u.show_bets_to_followers,
              (SELECT COUNT(*) FROM follows WHERE following_id = u.id) AS followers_count,
              (SELECT COUNT(*) FROM follows WHERE follower_id = u.id) AS following_count,
              (SELECT COUNT(*) FROM bets WHERE creator_user_id = u.id) AS total_bets,
              (SELECT COUNT(*) FROM bet_responses br
               JOIN bets b ON b.id = br.bet_id
               WHERE br.user_id = u.id AND br.status = 'accepted'
               AND b.status = 'SETTLED' AND br.selected_option_id = b.winning_option_id) AS wins,
              (SELECT COUNT(*) FROM bet_responses br
               JOIN bets b ON b.id = br.bet_id
               WHERE br.user_id = u.id AND br.status = 'accepted'
               AND b.status = 'SETTLED' AND br.selected_option_id <> b.winning_option_id) AS losses
       FROM users u WHERE u.id = $1`,
      [userId]
    );

    if (!userResult.rows.length)
      return res.status(404).json({ error: "User not found" });

    const user = userResult.rows[0];

    // Check if current user follows this user
    const followResult = await pool.query(
      `SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = $2`,
      [currentUserId, userId]
    );
    const isFollowing = followResult.rows.length > 0;

    // Check follow request status
    const requestResult = await pool.query(
      `SELECT status FROM follow_requests WHERE requester_id = $1 AND requestee_id = $2`,
      [currentUserId, userId]
    );
    const followRequestStatus = requestResult.rows[0]?.status ?? null;

    const profile = {
      id:                    user.id,
      username:              user.username,
      display_name:          `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim() || user.username,
      bio:                   user.bio ?? "",
      avatar_color:          user.avatar_color ?? "#2563eb",
      avatar_icon:           user.avatar_icon ?? "initials",
      is_private:            user.is_private ?? false,
      show_bets_to_followers: user.show_bets_to_followers ?? false,
      followers_count:       Number(user.followers_count),
      following_count:       Number(user.following_count),
      total_bets:            Number(user.total_bets),
      wins:                  Number(user.wins),
      losses:                Number(user.losses),
      is_following:          isFollowing,
      follow_request_status: followRequestStatus,
    };

    // Private + not following → stats only
    if (user.is_private && !isFollowing) {
      return res.json({ ...profile, bets: [], shared_bets: [] });
    }

    // Bets you're both involved in — full fields for BetCard
    const sharedBetsResult = await pool.query(
      `SELECT DISTINCT
         b.id, b.title, b.status, b.stake_amount, b.custom_stake,
         b.created_at, b.closes_at, b.winning_option_id,
         b.creator_user_id = $1 AS is_creator,
         bt.target_type,
         CASE WHEN bt.target_type = 'circle' THEN c.name ELSE tu.username END AS target_name,
         c.icon AS icon, c.icon_color,
         creator.username    AS creator_username,
         creator.avatar_color AS creator_avatar_color,
         creator.avatar_icon  AS creator_avatar_icon,
         my_r.selected_option_id AS my_option_id,
         (SELECT COUNT(*) FROM bet_responses WHERE bet_id = b.id AND status = 'accepted') AS total_joined
       FROM bets b
       JOIN bet_targets bt ON bt.bet_id = b.id
       LEFT JOIN circles c ON bt.target_type = 'circle' AND c.circle_id = bt.target_id
       LEFT JOIN users tu ON bt.target_type = 'user' AND tu.id = bt.target_id
       LEFT JOIN users creator ON creator.id = b.creator_user_id
       LEFT JOIN bet_responses my_r ON my_r.bet_id = b.id AND my_r.user_id = $1 AND my_r.status = 'accepted'
       LEFT JOIN bet_responses br2 ON br2.bet_id = b.id AND br2.user_id = $2 AND br2.status = 'accepted'
       WHERE (b.creator_user_id = $1 OR my_r.user_id = $1)
         AND (b.creator_user_id = $2 OR br2.user_id = $2)
       ORDER BY b.created_at DESC`,
      [currentUserId, userId]
    );

    // Circle bets — bets made in circles both users are members of
    const circleBetsResult = await pool.query(
      `SELECT DISTINCT
         b.id, b.title, b.status, b.stake_amount, b.custom_stake,
         b.created_at, b.closes_at, b.winning_option_id,
         b.creator_user_id = $1 AS is_creator,
         'circle' AS target_type,
         c.name AS target_name,
         c.icon AS icon, c.icon_color,
         creator.username     AS creator_username,
         creator.avatar_color AS creator_avatar_color,
         creator.avatar_icon  AS creator_avatar_icon,
         my_r.selected_option_id AS my_option_id,
         (SELECT COUNT(*) FROM bet_responses WHERE bet_id = b.id AND status = 'accepted') AS total_joined
       FROM bets b
       JOIN bet_targets bt ON bt.bet_id = b.id AND bt.target_type = 'circle'
       JOIN circles c ON c.circle_id = bt.target_id
       JOIN circle_members cm1 ON cm1.circle_id = c.circle_id AND cm1.user_id = $1 AND cm1.status = 'accepted'
       JOIN circle_members cm2 ON cm2.circle_id = c.circle_id AND cm2.user_id = $2 AND cm2.status = 'accepted'
       LEFT JOIN users creator ON creator.id = b.creator_user_id
       LEFT JOIN bet_responses my_r ON my_r.bet_id = b.id AND my_r.user_id = $1 AND my_r.status = 'accepted'
       ORDER BY b.created_at DESC`,
      [currentUserId, userId]
    );

    // Circles both users are in together
    const sharedCirclesResult = await pool.query(
      `SELECT c.circle_id, c.name, c.icon, c.icon_color, c.is_private,
         (SELECT COUNT(*) FROM circle_members WHERE circle_id = c.circle_id AND status = 'accepted') AS member_count
       FROM circles c
       JOIN circle_members cm1 ON cm1.circle_id = c.circle_id AND cm1.user_id = $1 AND cm1.status = 'accepted'
       JOIN circle_members cm2 ON cm2.circle_id = c.circle_id AND cm2.user_id = $2 AND cm2.status = 'accepted'
       ORDER BY c.name`,
      [currentUserId, userId]
    );

    // Their public circles (any public circle they are in, that we're not already in via shared_circles)
    const publicCirclesResult = await pool.query(
      `SELECT c.circle_id, c.name, c.icon, c.icon_color, c.is_private,
         (SELECT COUNT(*) FROM circle_members WHERE circle_id = c.circle_id AND status = 'accepted') AS member_count,
         EXISTS (
           SELECT 1 FROM circle_members
           WHERE circle_id = c.circle_id AND user_id = $1 AND status = 'accepted'
         ) AS am_member
       FROM circles c
       JOIN circle_members cm ON cm.circle_id = c.circle_id AND cm.user_id = $2 AND cm.status = 'accepted'
       WHERE c.is_private = false
       ORDER BY c.name`,
      [currentUserId, userId]
    );

    res.json({
      ...profile,
      shared_bets:    sharedBetsResult.rows,
      circle_bets:    circleBetsResult.rows,
      shared_circles: sharedCirclesResult.rows,
      public_circles: publicCirclesResult.rows,
      bets:           [],
    });
  } catch (err) {
    console.error("GET /users/:userId error:", err);
    res.status(500).json({ error: "Server error" });
  }

});

// ─── Report User ──────────────────────────────────────────────────────────────
usersRouter.post("/:userId/report", requireAuth, async (req: AuthRequest, res) => {
  const { userId } = req.params;
  const { reason } = req.body;
  if (!reason) return res.status(400).json({ error: "Reason required" });
  if (userId === req.userId) return res.status(400).json({ error: "Cannot report yourself" });
  try {
    const user = await pool.query(`SELECT id FROM users WHERE id = $1`, [userId]);
    if (!user.rows.length) return res.status(404).json({ error: "User not found" });
    await pool.query(
      `INSERT INTO reports (reporter_id, target_type, target_id, reason)
       VALUES ($1, 'user', $2, $3)`,
      [req.userId, userId, reason]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error("POST /users/:userId/report error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── Block a User ─────────────────────────────────────────────────────────────
usersRouter.post("/:userId/block", requireAuth, async (req: AuthRequest, res) => {
  const { userId } = req.params;
  const currentUserId = req.userId;
  if (userId === currentUserId) return res.status(400).json({ error: "Cannot block yourself" });
  try {
    // Insert block
    await pool.query(
      `INSERT INTO blocks (blocker_id, blocked_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [currentUserId, userId]
    );
    // Also remove any follows between the two users
    await pool.query(
      `DELETE FROM follows WHERE (follower_id = $1 AND following_id = $2) OR (follower_id = $2 AND following_id = $1)`,
      [currentUserId, userId]
    );
    // Remove any pending follow requests
    await pool.query(
      `DELETE FROM follow_requests WHERE (requester_id = $1 AND requestee_id = $2) OR (requester_id = $2 AND requestee_id = $1)`,
      [currentUserId, userId]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error("POST /users/:userId/block error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── Unblock a User ───────────────────────────────────────────────────────────
usersRouter.delete("/:userId/block", requireAuth, async (req: AuthRequest, res) => {
  const { userId } = req.params;
  const currentUserId = req.userId;
  try {
    await pool.query(
      `DELETE FROM blocks WHERE blocker_id = $1 AND blocked_id = $2`,
      [currentUserId, userId]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error("DELETE /users/:userId/block error:", err);
    res.status(500).json({ error: "Server error" });
  }
});