import { Router } from "express";
import { pool } from "../db";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { userWantsNotification } from "./notificationPrefs";
import { userWantsNotification } from "./notificationPrefs";

export const inboxRouter = Router();

// ─── Get Inbox (all notification types) ──────────────────────────────────────
inboxRouter.get("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        n.notification_id,
        n.type,
        n.entity_id,
        n.entity_type,
        n.is_read,
        n.created_at,

        -- Actor
        actor.id           AS actor_id,
        actor.username     AS actor_username,
        actor.avatar_color AS actor_avatar_color,
        actor.avatar_icon  AS actor_avatar_icon,

        -- Circle invite fields
        ci.invite_id,
        ci.status               AS invite_status,
        ci_circle.circle_id     AS circle_id,
        ci_circle.name          AS circle_name,
        ci_circle.icon          AS circle_icon,
        ci_circle.icon_color    AS circle_icon_color,

        -- Circle join request fields
        cjr.request_id,
        cjr.status              AS join_request_status,
        cjr_circle.name         AS join_request_circle_name,
        cjr_circle.icon         AS join_request_circle_icon,
        cjr_circle.icon_color   AS join_request_circle_icon_color,
        cjr_circle.circle_id    AS join_request_circle_id,

        -- Follow request fields
        fr.request_id           AS follow_request_id,
        fr.status               AS follow_request_status,

        -- Bet deadline fields
        b.id                    AS bet_id,
        b.title                 AS bet_title,
        b.closes_at             AS bet_closes_at,

        -- For new_follower: does the recipient already follow the actor back?
        EXISTS (
          SELECT 1 FROM follows
          WHERE follower_id = $1 AND following_id = n.actor_id
        ) AS viewer_follows_actor,
        EXISTS (
          SELECT 1 FROM follow_requests
          WHERE requester_id = $1 AND requestee_id = n.actor_id AND status = 'pending'
        ) AS viewer_requested_actor

      FROM notifications n
      LEFT JOIN users actor ON actor.id = n.actor_id

      -- Circle invite
      LEFT JOIN circle_invites ci
        ON n.entity_type = 'circle_invite' AND ci.invite_id = n.entity_id::uuid
      LEFT JOIN circles ci_circle ON ci.circle_id = ci_circle.circle_id

      -- Circle join request
      LEFT JOIN circle_join_requests cjr
        ON n.entity_type = 'circle_join_request' AND cjr.request_id = n.entity_id::uuid
      LEFT JOIN circles cjr_circle ON cjr.circle_id = cjr_circle.circle_id

      -- Follow request
      LEFT JOIN follow_requests fr
        ON n.entity_type = 'follow_request' AND fr.request_id = n.entity_id::uuid

      -- Bet deadline
      LEFT JOIN bets b
        ON n.entity_type = 'bet' AND b.id = n.entity_id::uuid

      WHERE n.recipient_id = $1
        AND (n.entity_type <> 'circle_invite'       OR ci.invite_id IS NOT NULL)
        AND (n.entity_type <> 'circle_join_request' OR cjr.request_id IS NOT NULL)
      ORDER BY n.created_at DESC
      `,
      [req.userId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("GET /inbox error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── Accept Circle Invite ─────────────────────────────────────────────────────
inboxRouter.post("/invites/:inviteId/accept", requireAuth, async (req: AuthRequest, res) => {
  const { inviteId } = req.params;
  const userId       = req.userId;
  const client       = await pool.connect();
  try {
    // Don't require status = 'pending' — handle already-accepted invites gracefully
    const invite = await client.query(
      `SELECT * FROM circle_invites WHERE invite_id = $1 AND invitee_id = $2`,
      [inviteId, userId]
    );
    if (!invite.rows.length)
      return res.status(400).json({ error: "Invite not found" });

    const circleId = invite.rows[0].circle_id;

    await client.query("BEGIN");
    await client.query(
      `UPDATE circle_invites SET status = 'accepted' WHERE invite_id = $1`,
      [inviteId]
    );
    await client.query(
      `INSERT INTO circle_members (circle_id, user_id, status, joined_at)
       VALUES ($1, $2, 'accepted', NOW())
       ON CONFLICT ON CONSTRAINT unique_member DO UPDATE SET status = 'accepted', joined_at = NOW()`,
      [circleId, userId]
    );
    await client.query(
      `DELETE FROM circle_join_requests WHERE circle_id = $1 AND user_id = $2`,
      [circleId, userId]
    );
    await client.query(
      `UPDATE notifications SET is_read = true
       WHERE recipient_id = $1 AND entity_id = $2 AND entity_type = 'circle_invite'`,
      [userId, inviteId]
    );
    await client.query("COMMIT");
    res.json({ success: true });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("ACCEPT INVITE ERROR:", err);
    res.status(500).json({ error: "Server error" });
  } finally {
    client.release();
  }
});

// ─── Decline Circle Invite ────────────────────────────────────────────────────
inboxRouter.post("/invites/:inviteId/decline", requireAuth, async (req: AuthRequest, res) => {
  const { inviteId }  = req.params;
  const currentUserId = req.userId;
  try {
    await pool.query(
      `DELETE FROM circle_invites WHERE invite_id = $1 AND invitee_id = $2`,
      [inviteId, currentUserId]
    );
    await pool.query(
      `DELETE FROM notifications
       WHERE recipient_id = $1 AND entity_id = $2 AND entity_type = 'circle_invite'`,
      [currentUserId, inviteId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error("DECLINE INVITE ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── Accept Follow Request ────────────────────────────────────────────────────
inboxRouter.post("/follow-requests/:requestId/accept", requireAuth, async (req: AuthRequest, res) => {
  const { requestId } = req.params;
  const userId        = req.userId;
  const client        = await pool.connect();
  try {
    const request = await client.query(
      `SELECT * FROM follow_requests
       WHERE request_id = $1 AND requestee_id = $2 AND status = 'pending'`,
      [requestId, userId]
    );
    if (!request.rows.length)
      return res.status(400).json({ error: "Follow request not found" });

    const requesterId = request.rows[0].requester_id;
    await client.query("BEGIN");
    await client.query(
      `UPDATE follow_requests SET status = 'accepted' WHERE request_id = $1`,
      [requestId]
    );
    await client.query(
      `INSERT INTO follows (follower_id, following_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [requesterId, userId]
    );
    if (await userWantsNotification(requesterId, "notify_follow_accepted")) {
      if (await userWantsNotification(requesterId, "notify_follow_accepted")) {
        await client.query(
          `INSERT INTO notifications (recipient_id, actor_id, type, entity_type, entity_id, is_read, created_at)
           VALUES ($1, $2, 'follow_accepted', 'follow_request', $3, false, NOW())`,
          [requesterId, userId, requestId]
        );
      }
    }
    await client.query(
      `UPDATE notifications SET is_read = true
       WHERE recipient_id = $1 AND entity_id = $2 AND entity_type = 'follow_request'`,
      [userId, requestId]
    );
    await client.query("COMMIT");
    res.json({ success: true });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("ACCEPT FOLLOW REQUEST ERROR:", err);
    res.status(500).json({ error: "Server error" });
  } finally {
    client.release();
  }
});

// ─── Decline Follow Request ───────────────────────────────────────────────────
inboxRouter.post("/follow-requests/:requestId/decline", requireAuth, async (req: AuthRequest, res) => {
  const { requestId } = req.params;
  const userId        = req.userId;
  try {
    await pool.query(
      `DELETE FROM follow_requests WHERE request_id = $1 AND requestee_id = $2`,
      [requestId, userId]
    );
    await pool.query(
      `DELETE FROM notifications
       WHERE recipient_id = $1 AND entity_id = $2 AND entity_type = 'follow_request'`,
      [userId, requestId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error("DECLINE FOLLOW REQUEST ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── Follow Back (from new_follower notification) ────────────────────────────
inboxRouter.post("/follow-back/:actorId", requireAuth, async (req: AuthRequest, res) => {
  const { actorId } = req.params;
  const userId      = req.userId!;
  const client      = await pool.connect();
  try {
    // Check if target is private
    const target = await client.query(
      `SELECT is_private FROM users WHERE id = $1`,
      [actorId]
    );
    if (!target.rows.length)
      return res.status(404).json({ error: "User not found" });

    const isPrivate = target.rows[0].is_private;

    // Check for existing follow or pending request
    const alreadyFollowing = await client.query(
      `SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = $2`,
      [userId, actorId]
    );
    if (alreadyFollowing.rows.length)
      return res.json({ status: "followed" });

    const existingRequest = await client.query(
      `SELECT request_id FROM follow_requests
       WHERE requester_id = $1 AND requestee_id = $2 AND status = 'pending'`,
      [userId, actorId]
    );
    if (existingRequest.rows.length)
      return res.json({ status: "requested" });

    await client.query("BEGIN");

    if (isPrivate) {
      // Send a follow request
      await client.query(
        `INSERT INTO follow_requests (requester_id, requestee_id, status, created_at)
         VALUES ($1, $2, 'pending', NOW())`,
        [userId, actorId]
      );
      const reqRow = await client.query(
        `SELECT request_id FROM follow_requests
         WHERE requester_id = $1 AND requestee_id = $2 AND status = 'pending'`,
        [userId, actorId]
      );
      const newRequestId = reqRow.rows[0].request_id;
      if (await userWantsNotification(actorId, "notify_follow_request")) {
        await client.query(
          `INSERT INTO notifications (recipient_id, actor_id, type, entity_type, entity_id, is_read, created_at)
           VALUES ($1, $2, 'follow_request', 'follow_request', $3, false, NOW())`,
          [actorId, userId, newRequestId]
        );
      }
      await client.query("COMMIT");
      return res.json({ status: "requested" });
    } else {
      // Public — follow directly
      await client.query(
        `INSERT INTO follows (follower_id, following_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [userId, actorId]
      );
      if (await userWantsNotification(actorId, "notify_new_follower")) {
        await client.query(
          `INSERT INTO notifications (recipient_id, actor_id, type, entity_type, entity_id, is_read, created_at)
           VALUES ($1, $2, 'new_follower', 'user', $2, false, NOW())`,
          [actorId, userId]
        );
      }
      await client.query("COMMIT");
      return res.json({ status: "followed" });
    }
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("FOLLOW BACK ERROR:", err);
    res.status(500).json({ error: "Server error" });
  } finally {
    client.release();
  }
});

// ─── Accept Circle Join Request (from inbox) ──────────────────────────────────
inboxRouter.post("/join-requests/:requestId/accept", requireAuth, async (req: AuthRequest, res) => {
  const { requestId } = req.params;
  const userId        = req.userId;
  const client        = await pool.connect();
  try {
    const request = await client.query(
      `SELECT * FROM circle_join_requests WHERE request_id = $1::uuid`,
      [requestId]
    );
    if (!request.rows.length)
      return res.status(400).json({ error: "Request not found" });

    if (request.rows[0].status === 'accepted')
      return res.json({ success: true });

    const { circle_id, user_id: requesterId } = request.rows[0];

    const member = await client.query(
      `SELECT 1 FROM circle_members
       WHERE circle_id = $1 AND user_id = $2 AND status = 'accepted'`,
      [circle_id, userId]
    );
    if (!member.rows.length)
      return res.status(403).json({ error: "Not a circle member" });

    await client.query("BEGIN");
    await client.query(
      `DELETE FROM notifications
       WHERE recipient_id = $1 AND entity_type = 'circle_invite'
         AND entity_id::uuid IN (
           SELECT invite_id FROM circle_invites
           WHERE circle_id = $2 AND invitee_id = $1
         )`,
      [requesterId, circle_id]
    );
    await client.query(
      `DELETE FROM circle_invites WHERE circle_id = $1 AND invitee_id = $2`,
      [circle_id, requesterId]
    );
    await client.query(
      `INSERT INTO circle_members (circle_id, user_id, status, joined_at)
       VALUES ($1, $2, 'accepted', NOW())
       ON CONFLICT ON CONSTRAINT unique_member DO UPDATE SET status = 'accepted', joined_at = NOW()`,
      [circle_id, requesterId]
    );
    await client.query(
      `UPDATE circle_join_requests SET status = 'accepted' WHERE request_id = $1`,
      [requestId]
    );
    await client.query(
      `UPDATE notifications SET is_read = true
       WHERE recipient_id = $1 AND entity_id = $2 AND entity_type = 'circle_join_request'`,
      [userId, requestId]
    );
    await client.query("COMMIT");
    res.json({ success: true });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("ACCEPT JOIN REQUEST ERROR:", err);
    res.status(500).json({ error: "Server error" });
  } finally {
    client.release();
  }
});

// ─── Decline Circle Join Request (from inbox) ─────────────────────────────────
inboxRouter.post("/join-requests/:requestId/decline", requireAuth, async (req: AuthRequest, res) => {
  const { requestId } = req.params;
  const userId        = req.userId;
  try {
    const request = await pool.query(
      `SELECT circle_id FROM circle_join_requests WHERE request_id = $1 AND status = 'pending'`,
      [requestId]
    );
    if (!request.rows.length)
      return res.status(400).json({ error: "Request not found" });

    const circle_id = request.rows[0].circle_id;

    const member = await pool.query(
      `SELECT 1 FROM circle_members
       WHERE circle_id = $1 AND user_id = $2 AND status = 'accepted'`,
      [circle_id, userId]
    );
    if (!member.rows.length)
      return res.status(403).json({ error: "Not a circle member" });

    await pool.query(
      `DELETE FROM circle_join_requests WHERE request_id = $1`,
      [requestId]
    );
    await pool.query(
      `DELETE FROM notifications
       WHERE entity_id = $1 AND entity_type = 'circle_join_request'`,
      [requestId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error("DECLINE JOIN REQUEST ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});
// ─── Delete Notification ──────────────────────────────────────────────────────
inboxRouter.delete("/:notificationId", requireAuth, async (req: AuthRequest, res) => {
  const { notificationId } = req.params;
  const userId = req.userId;
  try {
    await pool.query(
      `DELETE FROM notifications WHERE notification_id = $1 AND recipient_id = $2`,
      [notificationId, userId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error("DELETE notification error:", err);
    res.status(500).json({ error: "Server error" });
  }
});
// ─── Get Single Bet (for inbox deadline modal) ────────────────────────────────
inboxRouter.get("/bet/:betId", requireAuth, async (req: AuthRequest, res) => {
  const { betId } = req.params;
  const userId    = req.userId;
  try {
    const result = await pool.query(
      `
      SELECT
        b.id,
        b.title,
        b.description,
        b.stake_amount,
        b.custom_stake,
        b.winning_option_id,
        b.status,
        b.created_at,
        b.closes_at,
        b.creator_user_id,
        b.target_id,
        CASE WHEN b.creator_user_id = $2 THEN true ELSE false END AS is_creator,
        COALESCE(NULLIF(TRIM(CONCAT_WS(' ', u.first_name, u.last_name)), ''), u.username) AS creator_name,
        u.username     AS creator_username,
        u.avatar_color AS creator_avatar_color,
        u.avatar_icon  AS creator_avatar_icon,
        (SELECT COUNT(*) FROM bet_responses WHERE bet_id = b.id AND status = 'accepted') AS total_joined,
        br.selected_option_id AS my_option_id,
        c.name         AS circle_name,
        c.icon         AS icon,
        c.icon_color   AS circle_icon_color,
        CASE WHEN b.use_circle_coin THEN c.coin_name   END AS circle_coin_name,
        CASE WHEN b.use_circle_coin THEN c.coin_symbol END AS circle_coin_symbol,
        CASE WHEN b.use_circle_coin THEN c.coin_color  END AS circle_coin_color,
        CASE WHEN b.use_circle_coin THEN c.coin_icon   END AS circle_coin_icon,
        CASE WHEN b.post_to = 'circle' THEN 'circle' ELSE 'user' END AS target_type,
        COALESCE(NULLIF(TRIM(CONCAT_WS(' ', tu.first_name, tu.last_name)), ''), tu.username) AS target_name,
        COALESCE(
          json_agg(
            json_build_object(
              'id',          bo.id,
              'label',       bo.label,
              'text',        bo.option_text,
              'option_text', bo.option_text,
              'count', (
                SELECT COUNT(*) FROM bet_responses
                WHERE bet_id = b.id AND selected_option_id = bo.id AND status = 'accepted'
              )
            )
          ) FILTER (WHERE bo.id IS NOT NULL),
          '[]'
        ) AS options
      FROM bets b
      LEFT JOIN bet_options bo ON bo.bet_id = b.id
      LEFT JOIN bet_responses br ON br.bet_id = b.id AND br.user_id = $2
      LEFT JOIN users u ON u.id = b.creator_user_id
      LEFT JOIN circles c ON c.circle_id = b.target_id::uuid AND b.post_to = 'circle'
      LEFT JOIN users tu ON tu.id = b.target_id::uuid AND b.post_to = 'user'
      WHERE b.id = $1
      GROUP BY b.id, b.creator_user_id, b.target_id, br.selected_option_id, u.first_name, u.last_name, u.username,
               u.avatar_color, u.avatar_icon, c.name, c.icon, c.icon_color,
               c.coin_name, c.coin_symbol, c.coin_color, c.coin_icon,
               tu.first_name, tu.last_name, tu.username
      `,
      [betId, userId]
    );

    if (!result.rows.length)
      return res.status(404).json({ error: "Bet not found" });

    res.json(result.rows[0]);
  } catch (err) {
    console.error("GET /inbox/bet/:betId error:", err);
    res.status(500).json({ error: "Server error" });
  }
});