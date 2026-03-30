import { Router } from "express";
import { pool } from "../db";
import { requireAuth, AuthRequest } from "../middleware/auth";

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
        actor.username     AS actor_username,
        actor.avatar_color AS actor_avatar_color,
        actor.avatar_icon  AS actor_avatar_icon,

        -- Circle invite fields
        ci.invite_id,
        ci.status               AS invite_status,
        ci_circle.name          AS circle_name,
        ci_circle.icon          AS circle_icon,
        ci_circle.icon_color    AS circle_icon_color,

        -- Circle join request fields
        cjr.request_id,
        cjr.status              AS join_request_status,
        cjr_circle.name         AS join_request_circle_name,
        cjr_circle.icon         AS join_request_circle_icon,
        cjr_circle.icon_color   AS join_request_circle_icon_color,

        -- Follow request fields
        fr.request_id           AS follow_request_id,
        fr.status               AS follow_request_status,

        -- Bet deadline fields
        b.id                    AS bet_id,
        b.title                 AS bet_title,
        b.closes_at             AS bet_closes_at

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
    const invite = await client.query(
      `SELECT * FROM circle_invites
       WHERE invite_id = $1 AND invitee_id = $2 AND status = 'pending'`,
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
      `UPDATE follow_requests SET status = 'declined'
       WHERE request_id = $1 AND requestee_id = $2`,
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

// ─── Accept Circle Join Request (from inbox) ──────────────────────────────────
inboxRouter.post("/join-requests/:requestId/accept", requireAuth, async (req: AuthRequest, res) => {
  const { requestId } = req.params;
  const userId        = req.userId;
  const client        = await pool.connect();
  try {
    const request = await client.query(
      `SELECT * FROM circle_join_requests WHERE request_id = $1 AND status = 'pending'`,
      [requestId]
    );
    if (!request.rows.length)
      return res.status(400).json({ error: "Request not found" });

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
         AND entity_id IN (
           SELECT invite_id::text FROM circle_invites
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