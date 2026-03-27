import { Router } from "express";
import { pool } from "../db";
import { requireAuth, AuthRequest } from "../middleware/auth";

export const circlesRouter = Router();

// ─── Create Circle ────────────────────────────────────────────────────────────
circlesRouter.post("/", requireAuth, async (req: AuthRequest, res) => {
  const { name, description, icon, is_private } = req.body;
  const userId = req.userId;

  if (!name || name.length < 5 || name.length > 15)
    return res.status(400).json({ error: "Name must be 5-15 characters" });
  if (description && description.length > 100)
    return res.status(400).json({ error: "Description max 100 characters" });

  try {
    const existing = await pool.query(
      `SELECT 1 FROM circles WHERE LOWER(name) = LOWER($1)`, [name]
    );
    if (existing.rows.length)
      return res.status(409).json({ error: "A circle with that name already exists" });

    const circleResult = await pool.query(
      `INSERT INTO circles (name, description, icon, is_private)
       VALUES ($1, $2, $3, $4) RETURNING circle_id`,
      [name, description, icon, is_private ?? false]
    );
    const circleId = circleResult.rows[0].circle_id;
    await pool.query(
      `INSERT INTO circle_members (circle_id, user_id, status) VALUES ($1, $2, 'accepted')`,
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
      `SELECT c.circle_id, c.name, c.icon, c.is_private
       FROM circles c
       JOIN circle_members m ON m.circle_id = c.circle_id
       WHERE m.user_id = $1`,
      [req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("GET /circles/my error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── Check Name Availability ──────────────────────────────────────────────────
circlesRouter.get("/check-name", async (req, res) => {
  const name      = String(req.query.name ?? "").trim();
  const excludeId = req.query.excludeId as string | undefined;
  if (!name) return res.status(400).json({ error: "Name required" });
  try {
    const result = excludeId
      ? await pool.query(`SELECT 1 FROM circles WHERE LOWER(name) = LOWER($1) AND circle_id <> $2`, [name, excludeId])
      : await pool.query(`SELECT 1 FROM circles WHERE LOWER(name) = LOWER($1)`, [name]);
    res.json({ taken: result.rows.length > 0 });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// ─── Update Circle ────────────────────────────────────────────────────────────
circlesRouter.put("/:circleId", async (req, res) => {
  const { circleId } = req.params;
  const { name, description, icon, is_private } = req.body;

  if (!name || name.length < 5 || name.length > 15)
    return res.status(400).json({ error: "Name must be 5–15 characters" });
  if (description && description.length > 100)
    return res.status(400).json({ error: "Description max 100 characters" });

  try {
    const existing = await pool.query(
      `SELECT 1 FROM circles WHERE LOWER(name) = LOWER($1) AND circle_id <> $2`,
      [name, circleId]
    );
    if (existing.rows.length)
      return res.status(409).json({ error: "A circle with that name already exists" });

    const result = await pool.query(
      `UPDATE circles SET name = $1, description = $2, icon = $3, is_private = $4
       WHERE circle_id = $5
       RETURNING circle_id, name, description, icon, is_private`,
      [name, description, icon, is_private ?? false, circleId]
    );
    if (!result.rows.length) return res.status(404).json({ error: "Circle not found" });
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
      `SELECT u.id, u.username, u.avatar_color, u.avatar_icon
       FROM circle_members cm
       JOIN users u ON cm.user_id = u.id
       WHERE cm.circle_id = $1 AND cm.status = 'accepted'`,
      [circleId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("GET members error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── Search Friends to Add ────────────────────────────────────────────────────
circlesRouter.get("/:circleId/search-friends", requireAuth, async (req: AuthRequest, res) => {
  const { circleId } = req.params;
  const query         = req.query.q;
  const currentUserId = req.userId;

  try {
    const result = await pool.query(
      `SELECT
        u.id, u.username, u.avatar_color, u.avatar_icon,
        cm.status AS member_status,
        ci.status AS invite_status,
        ci.inviter_id
       FROM follows f
       JOIN users u ON u.id = f.following_id
       LEFT JOIN circle_members cm ON cm.user_id = u.id AND cm.circle_id = $2
       LEFT JOIN circle_invites ci ON ci.invitee_id = u.id AND ci.circle_id = $2 AND ci.status = 'pending'
       WHERE f.follower_id = $1 AND u.username ILIKE $3`,
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
      return { id: row.id, username: row.username, avatar_color: row.avatar_color, avatar_icon: row.avatar_icon, status, invitedByMe };
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
  const inviterId     = req.userId;

  try {
    const existing = await pool.query(
      `SELECT 1 FROM circle_invites WHERE circle_id = $1 AND invitee_id = $2 AND status = 'pending'`,
      [circleId, inviteeId]
    );
    if (existing.rows.length) return res.status(400).json({ error: "Already invited" });

    const invite = await pool.query(
      `INSERT INTO circle_invites (circle_id, inviter_id, invitee_id, status) VALUES ($1, $2, $3, 'pending') RETURNING invite_id`,
      [circleId, inviterId, inviteeId]
    );
    const inviteId = invite.rows[0].invite_id;

    await pool.query(
      `INSERT INTO notifications (recipient_id, actor_id, type, entity_type, entity_id) VALUES ($1, $2, 'circle_invite', 'circle_invite', $3)`,
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
      `SELECT invite_id FROM circle_invites WHERE circle_id = $1 AND invitee_id = $2 AND inviter_id = $3 AND status = 'pending'`,
      [circleId, inviteeId, currentUserId]
    );
    if (!invite.rows.length) return res.status(403).json({ error: "Cannot retract this invite" });

    const inviteId = invite.rows[0].invite_id;
    await pool.query(`DELETE FROM circle_invites WHERE invite_id = $1`, [inviteId]);
    await pool.query(
      `DELETE FROM notifications WHERE recipient_id = $1 AND entity_id = $2 AND entity_type = 'circle_invite'`,
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
    const userId        = req.userId;

    await client.query("BEGIN");
    await client.query(`DELETE FROM circle_members WHERE circle_id = $1 AND user_id = $2`, [circleId, userId]);

    const remaining = await client.query(`SELECT COUNT(*) FROM circle_members WHERE circle_id = $1`, [circleId]);
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

// ─── Circle History ───────────────────────────────────────────────────────────
circlesRouter.get("/:circleId/history", requireAuth, async (req: AuthRequest, res) => {
  const { circleId } = req.params;
  const userId        = req.userId;

  try {
    const circleResult = await pool.query(
      `SELECT circle_id, name, description, icon, created_at FROM circles WHERE circle_id = $1`,
      [circleId]
    );
    if (!circleResult.rows.length) return res.status(404).json({ error: "Circle not found" });
    const circle = circleResult.rows[0];

    const membersResult = await pool.query(
      `SELECT u.id, u.username, u.avatar_color, u.avatar_icon, cm.joined_at
       FROM circle_members cm
       JOIN users u ON cm.user_id = u.id
       WHERE cm.circle_id = $1 AND cm.status = 'accepted'
       ORDER BY cm.joined_at ASC`,
      [circleId]
    );

    const betsResult = await pool.query(
      `SELECT
         b.id, b.title, b.description, b.stake_amount, b.closes_at, b.created_at, b.status,
         b.creator_user_id,
         u.username AS creator_username,
         u.avatar_color AS creator_avatar_color,
         u.avatar_icon AS creator_avatar_icon,
         b.winning_option_id,
         b.proposed_winner_option_id,
         (SELECT COUNT(*) FROM bet_responses WHERE bet_id = b.id AND status = 'accepted')::int AS total_joined,
         br.selected_option_id AS my_option_id,
         br.status AS my_response,
         br.selected_option_id AS my_selected_option_id
       FROM bets b
       JOIN bet_targets bt ON bt.bet_id = b.id
       JOIN users u ON u.id = b.creator_user_id
       LEFT JOIN bet_responses br ON br.bet_id = b.id AND br.user_id = $2
       WHERE bt.target_type = 'circle' AND bt.target_id = $1
       ORDER BY b.created_at DESC`,
      [circleId, userId]
    );

    const betIds = betsResult.rows.map((b: any) => b.id);
    let optionsByBet: Record<string, any[]> = {};

    if (betIds.length > 0) {
      const optionsResult = await pool.query(
        `SELECT bo.bet_id, bo.id, bo.label, bo.option_text AS text,
           COUNT(br.id)::int AS count
         FROM bet_options bo
         LEFT JOIN bet_responses br ON br.selected_option_id = bo.id AND br.status = 'accepted'
         WHERE bo.bet_id = ANY($1)
         GROUP BY bo.bet_id, bo.id, bo.label, bo.option_text`,
        [betIds]
      );
      for (const opt of optionsResult.rows) {
        if (!optionsByBet[String(opt.bet_id)]) optionsByBet[String(opt.bet_id)] = [];
        optionsByBet[String(opt.bet_id)]!.push(opt);
      }
    }

    const bets = betsResult.rows.map((b: any) => ({ ...b, options: optionsByBet[b.id] || [] }));
    res.json({ circle, members: membersResult.rows, bets });
  } catch (err) {
    console.error("CIRCLE HISTORY ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── Request to Join Circle ───────────────────────────────────────────────────
circlesRouter.post("/:circleId/request-join", requireAuth, async (req: AuthRequest, res) => {
  const { circleId } = req.params;
  const userId        = req.userId;
  try {
    const member = await pool.query(
      `SELECT 1 FROM circle_members WHERE circle_id = $1 AND user_id = $2 AND status = 'accepted'`,
      [circleId, userId]
    );
    if (member.rows.length) return res.status(400).json({ error: "Already a member" });

    await pool.query(
      `INSERT INTO circle_join_requests (circle_id, user_id, status)
       VALUES ($1, $2, 'pending') ON CONFLICT (circle_id, user_id) DO NOTHING`,
      [circleId, userId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error("REQUEST JOIN ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── Join Circle (public only) ────────────────────────────────────────────────
circlesRouter.post("/:circleId/join", requireAuth, async (req: AuthRequest, res) => {
  const { circleId } = req.params;
  const userId        = req.userId;
  try {
    const circle = await pool.query(
      `SELECT is_private FROM circles WHERE circle_id = $1`, [circleId]
    );
    if (!circle.rows.length) return res.status(404).json({ error: "Circle not found" });
    if (circle.rows[0].is_private) return res.status(403).json({ error: "Circle is private" });

    await pool.query(
      `INSERT INTO circle_members (circle_id, user_id, status, joined_at)
       VALUES ($1, $2, 'accepted', NOW())
       ON CONFLICT ON CONSTRAINT unique_member DO NOTHING`,
      [circleId, userId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error("JOIN CIRCLE ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── Get Pending Join Requests ────────────────────────────────────────────────
circlesRouter.get("/:circleId/requests", requireAuth, async (req: AuthRequest, res) => {
  const { circleId } = req.params;
  const userId        = req.userId;
  try {
    const member = await pool.query(
      `SELECT 1 FROM circle_members WHERE circle_id = $1 AND user_id = $2 AND status = 'accepted'`,
      [circleId, userId]
    );
    if (!member.rows.length) return res.status(403).json({ error: "Not a member" });

    const result = await pool.query(
      `SELECT r.request_id, r.created_at, u.id AS user_id, u.username, u.avatar_color, u.avatar_icon
       FROM circle_join_requests r
       JOIN users u ON u.id = r.user_id
       WHERE r.circle_id = $1 AND r.status = 'pending'
       ORDER BY r.created_at ASC`,
      [circleId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("GET REQUESTS ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── Accept Join Request ──────────────────────────────────────────────────────
circlesRouter.post("/:circleId/requests/:requestId/accept", requireAuth, async (req: AuthRequest, res) => {
  const { circleId, requestId } = req.params;
  const userId                   = req.userId;
  const client                   = await pool.connect();
  try {
    const member = await client.query(
      `SELECT 1 FROM circle_members WHERE circle_id = $1 AND user_id = $2 AND status = 'accepted'`,
      [circleId, userId]
    );
    if (!member.rows.length) return res.status(403).json({ error: "Not a member" });

    const request = await client.query(
      `SELECT * FROM circle_join_requests WHERE request_id = $1 AND circle_id = $2 AND status = 'pending'`,
      [requestId, circleId]
    );
    if (!request.rows.length) return res.status(404).json({ error: "Request not found" });

    const requestUserId = request.rows[0].user_id;

    await client.query("BEGIN");

    // 1. Clean up any lingering invite notifications for this user in this circle
    await client.query(
      `DELETE FROM notifications
       WHERE recipient_id = $1
         AND entity_type = 'circle_invite'
         AND entity_id IN (
           SELECT invite_id FROM circle_invites
           WHERE circle_id = $2 AND invitee_id = $1
         )`,
      [requestUserId, circleId]
    );

    // 2. Clean up any lingering circle invites for this user in this circle
    await client.query(
      `DELETE FROM circle_invites WHERE circle_id = $1 AND invitee_id = $2`,
      [circleId, requestUserId]
    );

    // 3. Add to circle members
    await client.query(
      `INSERT INTO circle_members (circle_id, user_id, status, joined_at)
       VALUES ($1, $2, 'accepted', NOW())
       ON CONFLICT ON CONSTRAINT unique_member DO UPDATE SET status = 'accepted', joined_at = NOW()`,
      [circleId, requestUserId]
    );

    // 4. Mark request accepted
    await client.query(
      `UPDATE circle_join_requests SET status = 'accepted' WHERE request_id = $1`,
      [requestId]
    );

    await client.query("COMMIT");
    res.json({ success: true });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("ACCEPT REQUEST ERROR:", err);
    res.status(500).json({ error: "Server error" });
  } finally {
    client.release();
  }
});

// ─── Decline Join Request ─────────────────────────────────────────────────────
circlesRouter.post("/:circleId/requests/:requestId/decline", requireAuth, async (req: AuthRequest, res) => {
  const { circleId, requestId } = req.params;
  const userId                   = req.userId;
  try {
    const member = await pool.query(
      `SELECT 1 FROM circle_members WHERE circle_id = $1 AND user_id = $2 AND status = 'accepted'`,
      [circleId, userId]
    );
    if (!member.rows.length) return res.status(403).json({ error: "Not a member" });

    await pool.query(
      `DELETE FROM circle_join_requests WHERE request_id = $1 AND circle_id = $2`,
      [requestId, circleId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error("DECLINE REQUEST ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── Get Single Circle ────────────────────────────────────────────────────────
circlesRouter.get("/:circleId", async (req, res) => {
  const { circleId } = req.params;
  try {
    const result = await pool.query(`SELECT * FROM circles WHERE circle_id = $1`, [circleId]);
    if (!result.rows.length) return res.status(404).send("Circle not found");
    res.json(result.rows[0]);
  } catch (err) {
    console.error("GET circle error:", err);
    res.status(500).json({ error: "Server error" });
  }
});