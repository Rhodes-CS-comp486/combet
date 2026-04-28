import { Router } from "express";
import { pool } from "../db";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { sendPushNotification } from "../utils/push";
import { userWantsNotification } from "./notificationPrefs";

export const messagesRouter = Router();

// ─── Send a Message ───────────────────────────────────────────────────────────
// POST /messages
// Body: { recipientId, content }
// If sender doesn't follow recipient → is_request = true (goes to requests)
messagesRouter.post("/", requireAuth, async (req: AuthRequest, res) => {
  const senderId              = req.userId!;
  const { recipientId, content } = req.body;

  if (!recipientId || !content?.trim())
    return res.status(400).json({ error: "recipientId and content are required" });

  if (recipientId === senderId)
    return res.status(400).json({ error: "Cannot message yourself" });

  try {
    // is_request = true if the recipient doesn't follow the sender
    const followCheck = await pool.query(
      `SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = $2`,
      [senderId, recipientId]
    );
    const isRequest = followCheck.rows.length === 0;

    const result = await pool.query(
      `INSERT INTO direct_messages (sender_id, recipient_id, content, is_request, is_read, created_at)
       VALUES ($1, $2, $3, $4, false, NOW())
       RETURNING message_id, created_at`,
      [senderId, recipientId, content.trim(), isRequest]
    );

    // ── Push notification ──
    if (await userWantsNotification(recipientId, "notify_messages")) {
      const senderRow = await pool.query(
        `SELECT username FROM users WHERE id = $1`, [senderId]
      );
      const tokenRow = await pool.query(
        `SELECT push_token FROM users WHERE id = $1`, [recipientId]
      );
      const pushToken = tokenRow.rows[0]?.push_token;
      const senderUsername = senderRow.rows[0]?.username ?? "Someone";
      if (pushToken) {
        await sendPushNotification(
          pushToken,
          isRequest ? "New Message Request" : `${senderUsername}`,
          content.trim().slice(0, 100)
        );
      }
    }

    res.json({ success: true, message_id: result.rows[0].message_id, is_request: isRequest });
  } catch (err) {
    console.error("POST /messages error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── Get All DM Conversations ─────────────────────────────────────────────────
messagesRouter.get("/", requireAuth, async (req: AuthRequest, res) => {
  const userId = req.userId!;
  try {
    const result = await pool.query(
      `
      SELECT DISTINCT ON (other_user_id)
        other_user_id,
        u.username        AS other_username,
        u.avatar_color    AS other_avatar_color,
        u.avatar_icon     AS other_avatar_icon,
        m.content         AS last_message,
        m.sender_id       AS last_sender_id,
        m.created_at      AS last_message_at,
        m.is_read,
        (
          SELECT COUNT(*) FROM direct_messages unread
          WHERE unread.sender_id = m.other_user_id
            AND unread.recipient_id = $1
            AND unread.is_read = false
            AND unread.is_request = false
        ) AS unread_count
      FROM (
        SELECT
          CASE WHEN sender_id = $1 THEN recipient_id ELSE sender_id END AS other_user_id,
          message_id, content, sender_id, recipient_id, created_at, is_read
        FROM direct_messages
        WHERE (sender_id = $1 OR recipient_id = $1)
          AND (is_request = false OR sender_id = $1)
        ORDER BY created_at DESC
      ) m
      JOIN users u ON u.id = m.other_user_id
      ORDER BY other_user_id, m.created_at DESC
      `,
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("GET /messages error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── Get Message Requests ─────────────────────────────────────────────────────
messagesRouter.get("/requests", requireAuth, async (req: AuthRequest, res) => {
  const userId = req.userId!;
  try {
    const result = await pool.query(
      `
      SELECT
        m.message_id,
        m.content,
        m.created_at,
        m.is_read,
        u.id            AS sender_id,
        u.username      AS sender_username,
        u.avatar_color  AS sender_avatar_color,
        u.avatar_icon   AS sender_avatar_icon
      FROM direct_messages m
      JOIN users u ON u.id = m.sender_id
      WHERE m.recipient_id = $1
        AND m.is_request = true
      ORDER BY m.created_at DESC
      `,
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("GET /messages/requests error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── Get Total Unread DM Count ────────────────────────────────────────────────
messagesRouter.get("/unread-count", requireAuth, async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      `SELECT COUNT(*) AS count
       FROM direct_messages
       WHERE recipient_id = $1 AND is_read = false AND is_request = false`,
      [req.userId]
    );
    res.json({ count: Number(result.rows[0].count) });
  } catch (err) {
    console.error("GET /messages/unread-count error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── Mark All DMs as Read ─────────────────────────────────────────────────────
messagesRouter.patch("/read-all", requireAuth, async (req: AuthRequest, res) => {
  try {
    await pool.query(
      `UPDATE direct_messages SET is_read = true
       WHERE recipient_id = $1 AND is_read = false AND is_request = false`,
      [req.userId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error("PATCH /messages/read-all error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── Get Thread with a Specific User ─────────────────────────────────────────
messagesRouter.get("/:otherUserId", requireAuth, async (req: AuthRequest, res) => {
  const currentUserId  = req.userId!;
  const { otherUserId } = req.params;
  try {
    const result = await pool.query(
      `
      SELECT
        m.message_id,
        m.sender_id,
        m.recipient_id,
        m.content,
        m.is_read,
        m.created_at,
        u.username      AS sender_username,
        u.avatar_color  AS sender_avatar_color,
        u.avatar_icon   AS sender_avatar_icon
      FROM direct_messages m
      JOIN users u ON u.id = m.sender_id
      WHERE (is_request = false OR m.sender_id = $1)
        AND (
          (m.sender_id = $1 AND m.recipient_id = $2) OR
          (m.sender_id = $2 AND m.recipient_id = $1)
        )
      ORDER BY m.created_at ASC
      `,
      [currentUserId, otherUserId]
    );

    // Mark received messages as read
    await pool.query(
      `UPDATE direct_messages SET is_read = true
       WHERE sender_id = $2 AND recipient_id = $1 AND is_read = false`,
      [currentUserId, otherUserId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("GET /messages/:otherUserId error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── Accept Message Request ───────────────────────────────────────────────────
messagesRouter.patch("/requests/:messageId/accept", requireAuth, async (req: AuthRequest, res) => {
  const { messageId } = req.params;
  const userId        = req.userId!;
  try {
    const result = await pool.query(
      `UPDATE direct_messages SET is_request = false, is_read = true
       WHERE message_id = $1 AND recipient_id = $2
       RETURNING *`,
      [messageId, userId]
    );
    if (!result.rows.length)
      return res.status(404).json({ error: "Message request not found" });

    res.json({ success: true });
  } catch (err) {
    console.error("ACCEPT message request error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── Decline / Delete Message Request ────────────────────────────────────────
messagesRouter.delete("/requests/:messageId", requireAuth, async (req: AuthRequest, res) => {
  const { messageId } = req.params;
  const userId        = req.userId!;
  try {
    await pool.query(
      `DELETE FROM direct_messages WHERE message_id = $1 AND recipient_id = $2 AND is_request = true`,
      [messageId, userId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error("DELETE message request error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── Delete Entire Conversation ──────────────────────────────────────────────
messagesRouter.delete("/conversation/:otherUserId", requireAuth, async (req: AuthRequest, res) => {
  const { otherUserId } = req.params;
  const userId          = req.userId!;
  try {
    await pool.query(
      `DELETE FROM direct_messages
       WHERE (sender_id = $1 AND recipient_id = $2)
          OR (sender_id = $2 AND recipient_id = $1)`,
      [userId, otherUserId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error("DELETE conversation error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── Delete a Single DM ───────────────────────────────────────────────────────
messagesRouter.delete("/:messageId", requireAuth, async (req: AuthRequest, res) => {
  const { messageId } = req.params;
  const userId        = req.userId!;
  try {
    await pool.query(
      `DELETE FROM direct_messages WHERE message_id = $1 AND sender_id = $2`,
      [messageId, userId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error("DELETE message error:", err);
    res.status(500).json({ error: "Server error" });
  }
});