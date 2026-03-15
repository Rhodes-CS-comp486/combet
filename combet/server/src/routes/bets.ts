import { Router } from "express";
import { pool } from "../db";
import { requireAuth, AuthRequest } from "../middleware/auth";

export const betsRouter = Router();

// ─── Get My Bets ──────────────────────────────────────────────────────────────
betsRouter.get("/my-bets", requireAuth, async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        b.id,
        b.title,
        b.description,
        b.stake_amount,
        b.custom_stake,
        COALESCE(br.status, b.status) AS status,
        b.created_at,
        b.closes_at,
        CASE WHEN b.creator_user_id = $1 THEN true ELSE false END AS is_creator,
        COALESCE(NULLIF(TRIM(CONCAT_WS(' ', u.first_name, u.last_name)), ''), u.username) AS creator_name,
        u.avatar_color AS creator_avatar_color,
        u.avatar_icon  AS creator_avatar_icon,
        c.name AS circle_name,
        COALESCE(
          json_agg(
            json_build_object('id', bo.id, 'label', bo.label, 'option_text', bo.option_text)
          ) FILTER (WHERE bo.id IS NOT NULL),
          '[]'
        ) AS options
      FROM bets b
      LEFT JOIN bet_options bo ON bo.bet_id = b.id
      LEFT JOIN bet_responses br ON br.bet_id = b.id AND br.user_id = $1
      LEFT JOIN users u ON u.id = b.creator_user_id
      LEFT JOIN circles c ON c.circle_id = b.target_id::uuid AND b.post_to = 'circle'
      WHERE b.creator_user_id = $1
         OR EXISTS (
           SELECT 1 FROM bet_responses
           WHERE bet_id = b.id AND user_id = $1
         )
      GROUP BY b.id, br.status, u.first_name, u.last_name, u.username, u.avatar_color, u.avatar_icon, c.name
      ORDER BY b.created_at DESC
      `,
      [req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("GET /bets/my-bets error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── Create Bet ───────────────────────────────────────────────────────────────
betsRouter.post("/", requireAuth, async (req: AuthRequest, res) => {
  const client = await pool.connect();

  try {
    const { title, description, stake, customStake, closesAt, options, targetType, targetId } = req.body;
    const creatorUserId = req.userId;

    if (!targetType || !targetId) return res.status(400).json({ error: "Target required" });
    if (!title || !description || !options || options.length < 2) return res.status(400).json({ error: "Missing required fields" });
    if (!stake && !customStake) return res.status(400).json({ error: "Stake or custom stake required" });

    await client.query("BEGIN");

    const betResult = await client.query(
      `INSERT INTO bets (title, description, stake_amount, custom_stake, closes_at, creator_user_id, status, post_to, target_id)
       VALUES ($1, $2, $3, $4, $5, $6, 'PENDING', $7, $8) RETURNING id`,
      [title, description, stake ?? 0, customStake ?? null, closesAt, creatorUserId, targetType, targetId]
    );

    const betId = betResult.rows[0].id;

    await client.query(
      `INSERT INTO bet_targets (bet_id, target_type, target_id) VALUES ($1, $2, $3)`,
      [betId, targetType, targetId]
    );

    for (let i = 0; i < options.length; i++) {
      await client.query(
        `INSERT INTO bet_options (bet_id, label, option_text) VALUES ($1, $2, $3)`,
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

    const betResult = await client.query(`SELECT stake_amount FROM bets WHERE id = $1`, [betId]);
    if (!betResult.rows[0]) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Bet not found" });
    }
    const stake = betResult.rows[0].stake_amount;
    const userResult = await client.query(`SELECT coins FROM users WHERE id = $1`, [req.userId]);
    const coins = userResult.rows[0]?.coins ?? 0;

    if (stake > 0) {
      if (coins < stake) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: "Not enough coins", coins });
      }
      await client.query(`UPDATE users SET coins = coins - $1 WHERE id = $2`, [stake, req.userId]);
    }

    await client.query(
      `INSERT INTO bet_responses (bet_id, user_id, status, selected_option_id)
       VALUES ($1, $2, 'accepted', $3)
       ON CONFLICT (bet_id, user_id) DO UPDATE SET
         status = 'accepted', selected_option_id = EXCLUDED.selected_option_id, responded_at = now()`,
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
      `INSERT INTO bet_responses (bet_id, user_id, status) VALUES ($1, $2, 'declined')
       ON CONFLICT (bet_id, user_id) DO UPDATE SET status = 'declined', responded_at = now()`,
      [betId, req.userId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error("DECLINE BET ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});