import { Router } from "express";
import { pool } from "../db";
import { requireAuth, AuthRequest } from "../middleware/auth";

export const adminRouter = Router();

// ─── Admin: Get All Users ─────────────────────────────────────────────────────
adminRouter.get("/users", requireAuth, async (req: AuthRequest, res) => {
  try {
    const adminCheck = await pool.query(
      `SELECT is_admin FROM users WHERE id = $1`, [req.userId]
    );
    if (!adminCheck.rows[0]?.is_admin)
      return res.status(403).json({ error: "Forbidden" });

    const result = await pool.query(
      `SELECT id, username, email, first_name, last_name, created_at,
              avatar_color, avatar_icon, is_admin, coins
       FROM users
       ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error("GET /admin/users error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── Admin: Toggle User Admin Status ─────────────────────────────────────────
adminRouter.patch("/users/:userId/admin", requireAuth, async (req: AuthRequest, res) => {
  try {
    const adminCheck = await pool.query(
      `SELECT is_admin FROM users WHERE id = $1`, [req.userId]
    );
    if (!adminCheck.rows[0]?.is_admin)
      return res.status(403).json({ error: "Forbidden" });

    const { userId } = req.params;
    const { is_admin } = req.body;

    const result = await pool.query(
      `UPDATE users SET is_admin = $1 WHERE id = $2 RETURNING id, username, is_admin`,
      [is_admin, userId]
    );
    if (!result.rows.length) return res.status(404).json({ error: "User not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("PATCH /admin/users/:userId/admin error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── Admin: Delete User ───────────────────────────────────────────────────────
adminRouter.delete("/users/:userId", requireAuth, async (req: AuthRequest, res) => {
  try {
    const adminCheck = await pool.query(
      `SELECT is_admin FROM users WHERE id = $1`, [req.userId]
    );
    if (!adminCheck.rows[0]?.is_admin)
      return res.status(403).json({ error: "Forbidden" });

    const { userId } = req.params;

    if (userId === req.userId)
      return res.status(400).json({ error: "Cannot delete your own account" });

    await pool.query(`DELETE FROM sessions WHERE user_id = $1`, [userId]);
    await pool.query(`DELETE FROM follows WHERE follower_id = $1 OR following_id = $1`, [userId]);
    await pool.query(`DELETE FROM follow_requests WHERE requester_id = $1 OR requestee_id = $1`, [userId]);
    await pool.query(`DELETE FROM notifications WHERE recipient_id = $1 OR actor_id = $1`, [userId]);
    await pool.query(`DELETE FROM circle_invites WHERE inviter_id = $1 OR invitee_id = $1`, [userId]);
    await pool.query(`DELETE FROM circle_join_requests WHERE user_id = $1`, [userId]);
    await pool.query(`DELETE FROM circle_messages WHERE user_id = $1`, [userId]);
    await pool.query(`DELETE FROM circle_members WHERE user_id = $1`, [userId]);
    await pool.query(`DELETE FROM circle_members WHERE circle_id IN (SELECT circle_id FROM circles WHERE creator_id = $1)`, [userId]);
    await pool.query(`DELETE FROM circle_messages WHERE circle_id IN (SELECT circle_id FROM circles WHERE creator_id = $1)`, [userId]);
    await pool.query(`DELETE FROM circle_join_requests WHERE circle_id IN (SELECT circle_id FROM circles WHERE creator_id = $1)`, [userId]);
    await pool.query(`DELETE FROM circle_invites WHERE circle_id IN (SELECT circle_id FROM circles WHERE creator_id = $1)`, [userId]);
    await pool.query(`DELETE FROM circles WHERE creator_id = $1`, [userId]);
    await pool.query(`DELETE FROM bet_winner_votes WHERE user_id = $1`, [userId]);
    await pool.query(`DELETE FROM bet_responses WHERE user_id = $1`, [userId]);
    await pool.query(
      `UPDATE bets SET winning_option_id = NULL, proposed_winner_option_id = NULL WHERE creator_user_id = $1`,
      [userId]
    );
    await pool.query(`DELETE FROM bet_winner_votes WHERE bet_id IN (SELECT id FROM bets WHERE creator_user_id = $1)`, [userId]);
    await pool.query(`DELETE FROM bet_responses WHERE bet_id IN (SELECT id FROM bets WHERE creator_user_id = $1)`, [userId]);
    await pool.query(`DELETE FROM coin_transactions WHERE bet_id IN (SELECT id FROM bets WHERE creator_user_id = $1)`, [userId]);
    await pool.query(`DELETE FROM bet_options WHERE bet_id IN (SELECT id FROM bets WHERE creator_user_id = $1)`, [userId]);
    await pool.query(`DELETE FROM bet_targets WHERE bet_id IN (SELECT id FROM bets WHERE creator_user_id = $1)`, [userId]);
    await pool.query(`DELETE FROM bet_deadline_notifications WHERE bet_id IN (SELECT id FROM bets WHERE creator_user_id = $1)`, [userId]);
    await pool.query(`DELETE FROM bets WHERE creator_user_id = $1`, [userId]);

    const result = await pool.query(
      `DELETE FROM users WHERE id = $1 RETURNING id, username`,
      [userId]
    );
    if (!result.rows.length) return res.status(404).json({ error: "User not found" });
    return res.json({ ok: true, deleted: result.rows[0] });
  } catch (err) {
    console.error("DELETE /admin/users/:userId error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── Admin: Get All Bets ──────────────────────────────────────────────────────
adminRouter.get("/bets", requireAuth, async (req: AuthRequest, res) => {
  try {
    const adminCheck = await pool.query(
      `SELECT is_admin FROM users WHERE id = $1`, [req.userId]
    );
    if (!adminCheck.rows[0]?.is_admin)
      return res.status(403).json({ error: "Forbidden" });

    const result = await pool.query(
      `SELECT
         b.id, b.title, b.description, b.status, b.stake_amount, b.custom_stake,
         b.created_at, b.closes_at,
         u.username AS creator_username,
         u.avatar_color AS creator_avatar_color,
         u.avatar_icon AS creator_avatar_icon,
         (SELECT COUNT(*) FROM bet_responses br WHERE br.bet_id = b.id AND br.status = 'accepted') AS response_count
       FROM bets b
       JOIN users u ON u.id = b.creator_user_id
       ORDER BY b.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error("GET /admin/bets error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── Admin: Delete Bet ────────────────────────────────────────────────────────
adminRouter.delete("/bets/:betId", requireAuth, async (req: AuthRequest, res) => {
  try {
    const adminCheck = await pool.query(
      `SELECT is_admin FROM users WHERE id = $1`, [req.userId]
    );
    if (!adminCheck.rows[0]?.is_admin)
      return res.status(403).json({ error: "Forbidden" });

    const { betId } = req.params;

    // Null out FK references on bets before deleting options
    await pool.query(
      `UPDATE bets SET winning_option_id = NULL, proposed_winner_option_id = NULL WHERE id = $1`,
      [betId]
    );
    // Delete in dependency order
    await pool.query(`DELETE FROM bet_deadline_notifications WHERE bet_id = $1`, [betId]);
    await pool.query(`DELETE FROM bet_winner_votes WHERE bet_id = $1`, [betId]);
    await pool.query(`DELETE FROM bet_responses WHERE bet_id = $1`, [betId]);
    await pool.query(`DELETE FROM coin_transactions WHERE bet_id = $1`, [betId]);
    await pool.query(`DELETE FROM bet_targets WHERE bet_id = $1`, [betId]);
    await pool.query(`DELETE FROM bet_options WHERE bet_id = $1`, [betId]);

    const result = await pool.query(
      `DELETE FROM bets WHERE id = $1 RETURNING id, title`,
      [betId]
    );
    if (!result.rows.length) return res.status(404).json({ error: "Bet not found" });
    return res.json({ ok: true, deleted: result.rows[0] });
  } catch (err) {
    console.error("DELETE /admin/bets/:betId error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── Admin: Delete Circle ─────────────────────────────────────────────────────
adminRouter.delete("/circles/:circleId", requireAuth, async (req: AuthRequest, res) => {
  try {
    const adminCheck = await pool.query(
      `SELECT is_admin FROM users WHERE id = $1`, [req.userId]
    );
    if (!adminCheck.rows[0]?.is_admin)
      return res.status(403).json({ error: "Forbidden" });

    const { circleId } = req.params;

    // Delete in dependency order
    await pool.query(`DELETE FROM circle_invites WHERE circle_id = $1`, [circleId]);
    await pool.query(`DELETE FROM circle_join_requests WHERE circle_id = $1`, [circleId]);
    await pool.query(`DELETE FROM circle_messages WHERE circle_id = $1`, [circleId]);
    await pool.query(`DELETE FROM circle_members WHERE circle_id = $1`, [circleId]);

    const result = await pool.query(
      `DELETE FROM circles WHERE circle_id = $1 RETURNING circle_id, name`,
      [circleId]
    );
    if (!result.rows.length) return res.status(404).json({ error: "Circle not found" });
    return res.json({ ok: true, deleted: result.rows[0] });
  } catch (err) {
    console.error("DELETE /admin/circles/:circleId error:", err);
    res.status(500).json({ error: "Server error" });
  }
});
adminRouter.get("/circles", requireAuth, async (req: AuthRequest, res) => {
  try {
    const adminCheck = await pool.query(
      `SELECT is_admin FROM users WHERE id = $1`, [req.userId]
    );
    if (!adminCheck.rows[0]?.is_admin)
      return res.status(403).json({ error: "Forbidden" });

    const result = await pool.query(
      `SELECT
         c.circle_id, c.name, c.description, c.icon, c.icon_color,
         c.circle_color, c.is_private, c.created_at,
         u.username AS creator_username,
         (SELECT COUNT(*) FROM circle_members cm WHERE cm.circle_id = c.circle_id AND cm.status = 'accepted') AS member_count
       FROM circles c
       JOIN users u ON u.id = c.creator_id
       ORDER BY c.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error("GET /admin/circles error:", err);
    res.status(500).json({ error: "Server error" });
  }
});