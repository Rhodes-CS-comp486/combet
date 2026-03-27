import { Router } from "express";
import { pool } from "../db";
import { requireAuth, AuthRequest } from "../middleware/auth";

export const inboxRouter = Router();

// ─── Get Inbox (circle invites) ───────────────────────────────────────────────
inboxRouter.get("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        n.notification_id,
        n.type,
        n.entity_id,
        n.is_read,
        n.created_at,
        u.username   AS actor_username,
        c.name       AS circle_name,
        ci.invite_id,
        ci.status
      FROM notifications n
      JOIN circle_invites ci
        ON ci.invite_id = n.entity_id
      LEFT JOIN users   u ON n.actor_id   = u.id
      LEFT JOIN circles c ON ci.circle_id = c.circle_id
      WHERE n.recipient_id  = $1
        AND n.entity_type   = 'circle_invite'
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

// ─── Accept Invite ────────────────────────────────────────────────────────────
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

    // Mark invite accepted
    await client.query(
      `UPDATE circle_invites SET status = 'accepted' WHERE invite_id = $1`,
      [inviteId]
    );

    // Add to members
    await client.query(
      `INSERT INTO circle_members (circle_id, user_id, status, joined_at)
       VALUES ($1, $2, 'accepted', NOW())
       ON CONFLICT ON CONSTRAINT unique_member DO UPDATE SET status = 'accepted', joined_at = NOW()`,
      [circleId, userId]
    );

    // Clean up any pending join request for this user in this circle
    await client.query(
      `DELETE FROM circle_join_requests WHERE circle_id = $1 AND user_id = $2`,
      [circleId, userId]
    );

    // Mark notification read
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

// ─── Decline Invite ───────────────────────────────────────────────────────────
inboxRouter.post("/invites/:inviteId/decline", requireAuth, async (req: AuthRequest, res) => {
  const { inviteId }    = req.params;
  const currentUserId   = req.userId;

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