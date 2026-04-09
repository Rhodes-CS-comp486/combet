import { Router } from "express";
import { pool } from "../db";
import { requireAuth, AuthRequest } from "../middleware/auth";

export const circlesRouter = Router();

// ─── Create Circle ────────────────────────────────────────────────────────────
circlesRouter.post("/", requireAuth, async (req: AuthRequest, res) => {
  const { name, description, icon, icon_color, is_private } = req.body;
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
      `INSERT INTO circles (name, description, icon, icon_color, is_private, creator_id)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING circle_id`,
      [name, description, icon, icon_color, is_private ?? false, userId]
    );
    const circleId = circleResult.rows[0].circle_id;
    await pool.query(
      `INSERT INTO circle_members (circle_id, user_id, status, is_creator) VALUES ($1, $2, 'accepted', true)`,
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
      `SELECT c.circle_id, c.name, c.icon, c.icon_color, c.is_private
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
  const { name, description, icon, icon_color, is_private } = req.body;

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
      `UPDATE circles SET name = $1, description = $2, icon = $3, icon_color = $4, is_private = $5
       WHERE circle_id = $6
       RETURNING circle_id, name, description, icon, icon_color, is_private`,
      [name, description, icon, icon_color, is_private ?? false, circleId]
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
      `SELECT u.id, u.username, u.avatar_color, u.avatar_icon, cm.is_creator
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

// ─── Join Public Circle ───────────────────────────────────────────────────────
circlesRouter.post("/:circleId/join", requireAuth, async (req: AuthRequest, res) => {
  const { circleId } = req.params;
  const userId = req.userId;
  try {
    // Must be a public circle
    const circle = await pool.query(
      `SELECT circle_id, is_private FROM circles WHERE circle_id = $1`,
      [circleId]
    );
    if (!circle.rows.length) return res.status(404).json({ error: "Circle not found" });
    if (circle.rows[0].is_private) return res.status(403).json({ error: "This circle is private" });

    // Check not already a member
    const existing = await pool.query(
      `SELECT 1 FROM circle_members WHERE circle_id = $1 AND user_id = $2 AND status = 'accepted'`,
      [circleId, userId]
    );
    if (existing.rows.length) return res.status(400).json({ error: "Already a member" });

    await pool.query(
      `INSERT INTO circle_members (circle_id, user_id, status, joined_at)
       VALUES ($1, $2, 'accepted', NOW())
       ON CONFLICT ON CONSTRAINT unique_member DO UPDATE SET status = 'accepted', joined_at = NOW()`,
      [circleId, userId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error("JOIN CIRCLE ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── Leave Circle ─────────────────────────────────────────────────────────────
circlesRouter.delete("/:circleId/leave", requireAuth, async (req: AuthRequest, res) => {
  const client = await pool.connect();
  try {
    const { circleId } = req.params;
    const userId        = req.userId;

    // Verify they're actually a member
    const memberCheck = await client.query(
      `SELECT 1 FROM circle_members WHERE circle_id = $1 AND user_id = $2 AND status = 'accepted'`,
      [circleId, userId]
    );
    if (!memberCheck.rows.length) return res.status(403).json({ error: "Not a member" });

    await client.query("BEGIN");

    // Check remaining count BEFORE removing
    const remaining = await client.query(
      `SELECT COUNT(*) FROM circle_members WHERE circle_id = $1 AND status = 'accepted'`,
      [circleId]
    );
    const isLastMember = parseInt(remaining.rows[0].count, 10) === 1;

    if (isLastMember) {
      // ── Nuke everything related to this circle ──────────────────────────

      // 1. Notifications for circle invites
      await client.query(
        `DELETE FROM notifications
         WHERE entity_type = 'circle_invite'
           AND entity_id IN (
             SELECT invite_id FROM circle_invites WHERE circle_id = $1
           )`,
        [circleId]
      );

      // 2. Notifications for join requests
      await client.query(
        `DELETE FROM notifications
         WHERE entity_type = 'circle_join_request'
           AND entity_id IN (
             SELECT request_id FROM circle_join_requests WHERE circle_id = $1
           )`,
        [circleId]
      );

      // 3. Notifications for bets in this circle
      await client.query(
        `DELETE FROM notifications
         WHERE entity_type = 'bet'
           AND entity_id IN (
             SELECT bet_id FROM bet_targets
             WHERE target_type = 'circle' AND target_id = $1
           )`,
        [circleId]
      );

      // 4. Bet deadline notifications for bets in this circle
      await client.query(
        `DELETE FROM bet_deadline_notifications
         WHERE bet_id IN (
           SELECT bet_id FROM bet_targets
           WHERE target_type = 'circle' AND target_id = $1
         )`,
        [circleId]
      );

      // 4b. Bet winner votes for bets in this circle
      await client.query(
        `DELETE FROM bet_winner_votes
         WHERE bet_id IN (
           SELECT bet_id FROM bet_targets
           WHERE target_type = 'circle' AND target_id = $1
         )`,
        [circleId]
      );

      // 4c. Bet responses for bets in this circle
      await client.query(
        `DELETE FROM bet_responses
         WHERE bet_id IN (
           SELECT bet_id FROM bet_targets
           WHERE target_type = 'circle' AND target_id = $1
         )`,
        [circleId]
      );

      // 5. Bet options for bets in this circle
      await client.query(
        `DELETE FROM bet_options
         WHERE bet_id IN (
           SELECT bet_id FROM bet_targets
           WHERE target_type = 'circle' AND target_id = $1
         )`,
        [circleId]
      );

      // 6. Delete bets — CASCADE handles bet_targets automatically
      await client.query(
        `DELETE FROM bets WHERE id IN (
           SELECT bet_id FROM bet_targets
           WHERE target_type = 'circle' AND target_id = $1
         )`,
        [circleId]
      );

      // 7. Circle messages, invites, join requests, members
      await client.query(`DELETE FROM circle_messages WHERE circle_id = $1`, [circleId]);
      await client.query(`DELETE FROM circle_invites WHERE circle_id = $1`, [circleId]);
      await client.query(`DELETE FROM circle_join_requests WHERE circle_id = $1`, [circleId]);
      await client.query(`DELETE FROM circle_members WHERE circle_id = $1`, [circleId]);

      // 8. The circle itself
      await client.query(`DELETE FROM circles WHERE circle_id = $1`, [circleId]);

    } else {
      // ── Clean up only this user's data ─────────────────────────────────

      // 1. Check if the leaving user is the creator
      const creatorCheck = await client.query(
        `SELECT is_creator FROM circle_members WHERE circle_id = $1 AND user_id = $2`,
        [circleId, userId]
      );
      const isCreator = creatorCheck.rows[0]?.is_creator === true || creatorCheck.rows[0]?.is_creator === 't';

      // 2. Remove from circle
      await client.query(
        `DELETE FROM circle_members WHERE circle_id = $1 AND user_id = $2`,
        [circleId, userId]
      );

      // 3. If they were the creator, promote the next oldest member
      if (isCreator) {
        const nextMember = await client.query(
          `SELECT user_id FROM circle_members
           WHERE circle_id = $1 AND status = 'accepted'
           ORDER BY joined_at ASC NULLS LAST
           LIMIT 1`,
          [circleId]
        );
        if (nextMember.rows.length) {
          const newCreatorId = nextMember.rows[0].user_id;
          await client.query(
            `UPDATE circle_members SET is_creator = true WHERE circle_id = $1 AND user_id = $2`,
            [circleId, newCreatorId]
          );
          await client.query(
            `UPDATE circles SET creator_id = $1 WHERE circle_id = $2`,
            [newCreatorId, circleId]
          );
        }
      }

      // 2. Delete their messages in this circle
      await client.query(
        `DELETE FROM circle_messages WHERE circle_id = $1 AND user_id = $2`,
        [circleId, userId]
      );

      // 3. Remove their bet responses for bets in this circle
      await client.query(
        `DELETE FROM bet_responses
         WHERE user_id = $1
           AND bet_id IN (
             SELECT bet_id FROM bet_targets
             WHERE target_type = 'circle' AND target_id = $2
           )`,
        [userId, circleId]
      );

      // 3c. Delete their bet winner votes for bets in this circle
      await client.query(
        `DELETE FROM bet_winner_votes
         WHERE user_id = $1
           AND bet_id IN (
             SELECT bet_id FROM bet_targets
             WHERE target_type = 'circle' AND target_id = $2
           )`,
        [userId, circleId]
      );

      // 4. Delete notifications sent TO them about this circle (invites, join requests)
      await client.query(
        `DELETE FROM notifications
         WHERE recipient_id = $1
           AND entity_type = 'circle_invite'
           AND entity_id IN (
             SELECT invite_id FROM circle_invites WHERE circle_id = $2
           )`,
        [userId, circleId]
      );
      await client.query(
        `DELETE FROM notifications
         WHERE recipient_id = $1
           AND entity_type = 'circle_join_request'
           AND entity_id IN (
             SELECT request_id FROM circle_join_requests WHERE circle_id = $2
           )`,
        [userId, circleId]
      );

      // 5. Delete any pending invite or join request for this user in this circle
      await client.query(
        `DELETE FROM circle_invites WHERE circle_id = $1 AND invitee_id = $2`,
        [circleId, userId]
      );
      await client.query(
        `DELETE FROM circle_join_requests WHERE circle_id = $1 AND user_id = $2`,
        [circleId, userId]
      );
    }

    await client.query("COMMIT");
    res.json({ success: true, circleDeleted: isLastMember });
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
      `SELECT circle_id, name, description, icon, icon_color, created_at FROM circles WHERE circle_id = $1`,
      [circleId]
    );
    if (!circleResult.rows.length) return res.status(404).json({ error: "Circle not found" });
    const circle = circleResult.rows[0];

    const membersResult = await pool.query(
      `SELECT u.id, u.username, u.avatar_color, u.avatar_icon, cm.joined_at, cm.is_creator
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
         CASE WHEN b.creator_user_id = $2 THEN true ELSE false END AS is_creator,
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

    // logic for checking if user added before accepted
    const existingInvite = await pool.query(
        `SELECT invite_id FROM circle_invites WHERE circle_id = $1 AND invitee_id = $2 AND status = 'pending'`,
        [circleId, userId]
    );
    if (existingInvite.rows.length) {
        // Just accept the invite instead
        await pool.query(
            `UPDATE circle_invites SET status = 'accepted' WHERE invite_id = $1`,
            [existingInvite.rows[0].invite_id]
        );
    await pool.query(
        `INSERT INTO circle_members (circle_id, user_id, status, joined_at)
            VALUES ($1, $2, 'accepted', NOW())
            ON CONFLICT ON CONSTRAINT unique_member DO UPDATE SET status = 'accepted', joined_at = NOW()`,
        [circleId, userId]
    );
    return res.json({ success: true });
    }

    // Insert the join request
    const requestResult = await pool.query(
      `INSERT INTO circle_join_requests (circle_id, user_id, status)
       VALUES ($1, $2, 'pending')
       ON CONFLICT (circle_id, user_id) DO NOTHING
       RETURNING request_id`,
      [circleId, userId]
    );

    // Only fire notifications if a new request was actually created
    if (requestResult.rows.length) {
      const requestId = requestResult.rows[0].request_id;

      // Notify all current circle members
      const members = await pool.query(
        `SELECT user_id FROM circle_members
         WHERE circle_id = $1 AND status = 'accepted' AND user_id <> $2`,
        [circleId, userId]
      );

      for (const m of members.rows) {
        await pool.query(
          `INSERT INTO notifications
             (recipient_id, actor_id, type, entity_type, entity_id)
           VALUES ($1, $2, 'circle_join_request', 'circle_join_request', $3)`,
          [m.user_id, userId, requestId]
        );
      }
    }

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
    // After the INSERT into circle_members:
    await pool.query(
        `DELETE FROM notifications WHERE recipient_id = $1 AND entity_type = 'circle_invite'
        AND entity_id IN (SELECT invite_id::text FROM circle_invites WHERE circle_id = $2 AND invitee_id = $1)`,
        [userId, circleId]
    );
    await pool.query(
        `DELETE FROM circle_invites WHERE circle_id = $1 AND invitee_id = $2`,
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

// ─── Get Circle Messages ──────────────────────────────────────────────────────
// GET /circles/:circleId/messages?before=<message_id>
circlesRouter.get("/:circleId/messages", requireAuth, async (req: AuthRequest, res) => {
  const { circleId } = req.params;
  const userId       = req.userId;
  const before       = req.query.before ? Number(req.query.before) : null;
  const limit        = 40;

  try {
    // Must be a member
    const member = await pool.query(
      `SELECT 1 FROM circle_members WHERE circle_id = $1 AND user_id = $2 AND status = 'accepted'`,
      [circleId, userId]
    );
    if (!member.rows.length) return res.status(403).json({ error: "Not a member" });

    const result = before
      ? await pool.query(
          `SELECT
             m.message_id, m.content, m.created_at,
             u.id AS user_id, u.username, u.avatar_color, u.avatar_icon
           FROM circle_messages m
           JOIN users u ON u.id = m.user_id
           WHERE m.circle_id = $1 AND m.message_id < $2
           ORDER BY m.created_at DESC
           LIMIT $3`,
          [circleId, before, limit]
        )
      : await pool.query(
          `SELECT
             m.message_id, m.content, m.created_at,
             u.id AS user_id, u.username, u.avatar_color, u.avatar_icon
           FROM circle_messages m
           JOIN users u ON u.id = m.user_id
           WHERE m.circle_id = $1
           ORDER BY m.created_at DESC
           LIMIT $2`,
          [circleId, limit]
        );

    // Return oldest-first so the UI can render top-to-bottom
    res.json(result.rows.reverse());
  } catch (err) {
    console.error("GET MESSAGES ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── Post Circle Message ──────────────────────────────────────────────────────
// POST /circles/:circleId/messages
circlesRouter.post("/:circleId/messages", requireAuth, async (req: AuthRequest, res) => {
  const { circleId } = req.params;
  const userId       = req.userId;
  const { content }  = req.body;

  if (!content || !content.trim())
    return res.status(400).json({ error: "Message cannot be empty" });
  if (content.trim().length > 500)
    return res.status(400).json({ error: "Message too long (max 500 chars)" });

  try {
    // Must be a member
    const member = await pool.query(
      `SELECT 1 FROM circle_members WHERE circle_id = $1 AND user_id = $2 AND status = 'accepted'`,
      [circleId, userId]
    );
    if (!member.rows.length) return res.status(403).json({ error: "Not a member" });

    const result = await pool.query(
      `INSERT INTO circle_messages (circle_id, user_id, content)
       VALUES ($1, $2, $3)
       RETURNING message_id, content, created_at`,
      [circleId, userId, content.trim()]
    );

    const userResult = await pool.query(
      `SELECT id AS user_id, username, avatar_color, avatar_icon FROM users WHERE id = $1`,
      [userId]
    );

    res.status(201).json({ ...result.rows[0], ...userResult.rows[0] });
  } catch (err) {
    console.error("POST MESSAGE ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── Poll for New Messages ────────────────────────────────────────────────────
// GET /circles/:circleId/messages/since/:messageId
circlesRouter.get("/:circleId/messages/since/:messageId", requireAuth, async (req: AuthRequest, res) => {
  const { circleId, messageId } = req.params;
  const userId                   = req.userId;

  try {
    const member = await pool.query(
      `SELECT 1 FROM circle_members WHERE circle_id = $1 AND user_id = $2 AND status = 'accepted'`,
      [circleId, userId]
    );
    if (!member.rows.length) return res.status(403).json({ error: "Not a member" });

    const result = await pool.query(
      `SELECT
         m.message_id, m.content, m.created_at,
         u.id AS user_id, u.username, u.avatar_color, u.avatar_icon
       FROM circle_messages m
       JOIN users u ON u.id = m.user_id
       WHERE m.circle_id = $1 AND m.message_id > $2
       ORDER BY m.created_at ASC`,
      [circleId, messageId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("POLL MESSAGES ERROR:", err);
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