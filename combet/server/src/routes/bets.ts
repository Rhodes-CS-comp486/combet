import { Router } from "express";
import { pool } from "../db";
import { requireAuth, AuthRequest } from "../middleware/auth";

export const betsRouter = Router();

// ─── Create Bet ───────────────────────────────────────────────────────────────
betsRouter.post("/", requireAuth, async (req: AuthRequest, res) => {
  const client = await pool.connect();

  try {
    const { title, description, stake, closesAt, options, targetType, targetId } = req.body;
    const creatorUserId = req.userId;

    if (!targetType || !targetId) {
      return res.status(400).json({ error: "Target required" });
    }
    if (!title || !description || !stake || !options || options.length < 2) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    await client.query("BEGIN");

    const betResult = await client.query(
      `
      INSERT INTO bets (title, description, stake_amount, closes_at, creator_user_id, status, post_to, target_id)
      VALUES ($1, $2, $3, $4, $5, 'PENDING', $6, $7)
      RETURNING id
      `,
      [title, description, stake, closesAt, creatorUserId, targetType, targetId]
    );

    const betId = betResult.rows[0].id;

    await client.query(
      `
      INSERT INTO bet_targets (bet_id, target_type, target_id)
      VALUES ($1, $2, $3)
      `,
      [betId, targetType, targetId]
    );

    for (let i = 0; i < options.length; i++) {
      await client.query(
        `
        INSERT INTO bet_options (bet_id, label, option_text)
        VALUES ($1, $2, $3)
        `,
        [betId, String.fromCharCode(65 + i), options[i]]
      );
    }

    await client.query("COMMIT");
    res.status(201).json({ success: true, betId });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("CREATE BET ERROR:", error);
    res.status(500).json({ error: "Failed to create bet" });
  } finally {
    client.release();
  }
});

// ─── Accept Bet ───────────────────────────────────────────────────────────────
betsRouter.post("/:betId/accept", requireAuth, async (req: AuthRequest, res) => {
  const { betId } = req.params;
  const { selectedOptionId } = req.body;

  try {
    await pool.query(
      `
      INSERT INTO bet_responses (bet_id, user_id, status, selected_option_id)
      VALUES ($1, $2, 'accepted', $3)
      ON CONFLICT (bet_id, user_id) DO UPDATE SET
        status = 'accepted',
        selected_option_id = EXCLUDED.selected_option_id,
        responded_at = now()
      `,
      [betId, req.userId, selectedOptionId]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("ACCEPT BET ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── Decline Bet ──────────────────────────────────────────────────────────────
betsRouter.post("/:betId/decline", requireAuth, async (req: AuthRequest, res) => {
  const { betId } = req.params;

  try {
    await pool.query(
      `
      INSERT INTO bet_responses (bet_id, user_id, status)
      VALUES ($1, $2, 'declined')
      ON CONFLICT (bet_id, user_id) DO UPDATE SET
        status = 'declined',
        responded_at = now()
      `,
      [betId, req.userId]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("DECLINE BET ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});