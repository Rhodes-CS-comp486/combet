import { Router } from "express";
import { pool } from "../db";
import { requireAuth, AuthRequest } from "../middleware/auth";

export const betsRouter = Router();

// ─── Create Bet ───────────────────────────────────────────────────────────────
betsRouter.post("/", requireAuth, async (req: AuthRequest, res) => {
  const client = await pool.connect();

  try {
    const { title, description, stake, customStake, closesAt, options, targetType, targetId } = req.body;
    const creatorUserId = req.userId;

    if (!targetType || !targetId) {
      return res.status(400).json({ error: "Target required" });
    }
    if (!title || !description || !options || options.length < 2) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    if (!stake && !customStake) {
      return res.status(400).json({ error: "Stake or custom stake required" });
    }

    await client.query("BEGIN");

    const betResult = await client.query(
      `
      INSERT INTO bets (title, description, stake_amount, custom_stake, closes_at, creator_user_id, status, post_to, target_id)
      VALUES ($1, $2, $3, $4, $5, $6, 'PENDING', $7, $8)
      RETURNING id
      `,
      [title, description, stake ?? 0, customStake ?? null, closesAt, creatorUserId, targetType, targetId]
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
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const betResult = await client.query(
      `SELECT stake_amount FROM bets WHERE id = $1`,
      [betId]
    );
    if (!betResult.rows[0]) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Bet not found" });
    }
    const stake = betResult.rows[0].stake_amount;

    const userResult = await client.query(
      `SELECT coins FROM users WHERE id = $1`,
      [req.userId]
    );

    const coins = userResult.rows[0]?.coins ?? 0;
    if (stake > 0) {
      if (coins < stake) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: "Not enough coins", coins });
      }
      await client.query(
        `UPDATE users SET coins = coins - $1 WHERE id = $2`,
        [stake, req.userId]
      );
    }

    await client.query(
      `INSERT INTO bet_responses (bet_id, user_id, status, selected_option_id)
       VALUES ($1, $2, 'accepted', $3)
       ON CONFLICT (bet_id, user_id) DO UPDATE SET
         status = 'accepted',
         selected_option_id = EXCLUDED.selected_option_id,
         responded_at = now()`,
      [betId, req.userId, selectedOptionId]
    );

    await client.query("COMMIT");

    const updated = await pool.query(`SELECT coins FROM users WHERE id = $1`, [req.userId]);
    res.json({ success: true, coins: updated.rows[0].coins });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("ACCEPT BET ERROR:", err);
    res.status(500).json({ error: "Server error" });
  } finally {
    client.release();
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