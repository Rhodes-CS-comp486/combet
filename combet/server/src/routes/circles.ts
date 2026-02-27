import { Router } from "express";
import { pool } from "../db";
import { requireAuth, AuthRequest } from "../middleware/auth";

export const circlesRouter = Router();

// ─── Create Circle ────────────────────────────────────────────────────────────
circlesRouter.post("/", requireAuth, async (req: AuthRequest, res) => {
  const { name, description, icon } = req.body;
  const userId = req.userId;

  if (!name || name.length < 5 || name.length > 15) {
    return res.status(400).json({ error: "Name must be 5-15 characters" });
  }
  if (description && description.length > 100) {
    return res.status(400).json({ error: "Description max 100 characters" });
  }

  try {
    const circleResult = await pool.query(
      `
      INSERT INTO circles (name, description, icon)
      VALUES ($1, $2, $3)
      RETURNING circle_id
      `,
      [name, description, icon]
    );

    const circleId = circleResult.rows[0].circle_id;

    // Insert creator as accepted member
    await pool.query(
      `
      INSERT INTO circle_members (circle_id, user_id, status)
      VALUES ($1, $2, 'accepted')
      `,
      [circleId, userId]
    );

    res.status(201).json({ circle_id: circleId });
  } catch (err) {
    console.error("CREATE CIRCLE ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── Get My Circles ───────────────────────────────────────────────────────────
circlesRouter.get("/my", requireAuth, async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      `
      SELECT c.circle_id, c.name, c.icon
      FROM circles c
      JOIN circle_members m ON m.circle_id = c.circle_id
      WHERE m.user_id = $1
      `,
      [req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("GET /circles/my error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── Get Single Circle ────────────────────────────────────────────────────────
circlesRouter.get("/:circleId", async (req, res) => {
  const { circleId } = req.params;

  try {
    const result = await pool.query(
      "SELECT * FROM circles WHERE circle_id = $1",
      [circleId]
    );

    if (!result.rows.length) {
      return res.status(404).send("Circle not found");
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("GET circle error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── Update Circle ────────────────────────────────────────────────────────────
circlesRouter.put("/:circleId", async (req, res) => {
  const { circleId } = req.params;
  const { name, description, icon } = req.body;

  if (!name || name.length < 5 || name.length > 15) {
    return res.status(400).json({ error: "Name must be 5–15 characters" });
  }
  if (description && description.length > 100) {
    return res.status(400).json({ error: "Description max 100 characters" });
  }

  try {
    const result = await pool.query(
      `
      UPDATE circles
      SET name = $1,
          description = $2,
          icon = $3
      WHERE circle_id = $4
      RETURNING circle_id, name, description, icon
      `,
      [name, description, icon, circleId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "Circle not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("PUT circle error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── Get Circle Members ───────────────────────────────────────────────────────
circlesRouter.get("/:id/members", async (req, res) => {
  const circleId = req.params.id;

  try {
    const result = await pool.query(
      `
      SELECT u.id, u.username
      FROM circle_members cm
      JOIN users u ON cm.user_id = u.id
      WHERE cm.circle_id = $1
      AND cm.status = 'accepted'
      `,
      [circleId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("GET members error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── Search Friends to Add ───────────────────────────────────────────────────
circlesRouter.get("/:circleId/search-friends", requireAuth, async (req: AuthRequest, res) => {
  const { circleId } = req.params;
  const query = req.query.q;
  const currentUserId = req.userId;

  try {
    const result = await pool.query(
      `
      SELECT
        u.id,
        u.username,
        cm.status AS member_status,
        ci.status AS invite_status,
        ci.inviter_id
      FROM follows f
      JOIN users u ON u.id = f.following_id
      LEFT JOIN circle_members cm
        ON cm.user_id = u.id
        AND cm.circle_id = $2
      LEFT JOIN circle_invites ci
        ON ci.invitee_id = u.id
        AND ci.circle_id = $2
        AND ci.status = 'pending'
      WHERE f.follower_id = $1
      AND u.username ILIKE $3
      `,
      [currentUserId, circleId, `%${query}%`]
    );

    const normalized = result.rows.map((row) => {
      let status: "accepted" | "pending" | null = null;
      let invitedByMe = false;

      if (row.member_status === "accepted") {
        status = "accepted";
      } else if (row.invite_status === "pending") {
        status = "pending";
        invitedByMe = row.inviter_id === currentUserId;
      }

      return { id: row.id, username: row.username, status, invitedByMe };
    });

    res.json(normalized);
  } catch (err) {
    console.error("search-friends error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── Invite Friend to Circle ──────────────────────────────────────────────────
circlesRouter.post("/:circleId/invite", requireAuth, async (req: AuthRequest, res) => {
  const { circleId } = req.params;
  const { inviteeId } = req.body;
  const inviterId = req.userId;

  try {
    const existing = await pool.query(
      `
      SELECT 1 FROM circle_invites
      WHERE circle_id = $1
      AND invitee_id = $2
      AND status = 'pending'
      `,
      [circleId, inviteeId]
    );

    if (existing.rows.length) {
      return res.status(400).json({ error: "Already invited" });
    }

    const invite = await pool.query(
      `
      INSERT INTO circle_invites (circle_id, inviter_id, invitee_id, status)
      VALUES ($1, $2, $3, 'pending')
      RETURNING invite_id
      `,
      [circleId, inviterId, inviteeId]
    );

    const inviteId = invite.rows[0].invite_id;

    await pool.query(
      `
      INSERT INTO notifications (recipient_id, actor_id, type, entity_type, entity_id)
      VALUES ($1, $2, 'circle_invite', 'circle_invite', $3)
      `,
      [inviteeId, inviterId, inviteId]
    );

    res.json({ success: true, inviteId });
  } catch (err) {
    console.error("INVITE ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── Retract Invite ───────────────────────────────────────────────────────────
circlesRouter.delete("/:circleId/retract/:inviteeId", requireAuth, async (req: AuthRequest, res) => {
  const { circleId, inviteeId } = req.params;
  const currentUserId = req.userId;

  try {
    const invite = await pool.query(
      `
      SELECT invite_id
      FROM circle_invites
      WHERE circle_id = $1
      AND invitee_id = $2
      AND inviter_id = $3
      AND status = 'pending'
      `,
      [circleId, inviteeId, currentUserId]
    );

    if (!invite.rows.length) {
      return res.status(403).json({ error: "Cannot retract this invite" });
    }

    const inviteId = invite.rows[0].invite_id;

    await pool.query(`DELETE FROM circle_invites WHERE invite_id = $1`, [inviteId]);
    await pool.query(
      `
      DELETE FROM notifications
      WHERE recipient_id = $1
      AND entity_id = $2
      AND entity_type = 'circle_invite'
      `,
      [inviteeId, inviteId]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("RETRACT ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── Leave Circle ─────────────────────────────────────────────────────────────
circlesRouter.delete("/:circleId/leave", requireAuth, async (req: AuthRequest, res) => {
  const client = await pool.connect();

  try {
    const { circleId } = req.params;
    const userId = req.userId;

    await client.query("BEGIN");

    await client.query(
      `DELETE FROM circle_members WHERE circle_id = $1 AND user_id = $2`,
      [circleId, userId]
    );

    const remaining = await client.query(
      `SELECT COUNT(*) FROM circle_members WHERE circle_id = $1`,
      [circleId]
    );

    if (parseInt(remaining.rows[0].count, 10) === 0) {
      await client.query(`DELETE FROM circles WHERE circle_id = $1`, [circleId]);
    }

    await client.query("COMMIT");
    res.json({ success: true });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("LEAVE CIRCLE ERROR:", err);
    res.status(500).json({ error: "Server error" });
  } finally {
    client.release();
  }
});