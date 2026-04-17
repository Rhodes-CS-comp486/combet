import { Router } from "express";
import { pool } from "../db";
import { requireAuth, AuthRequest } from "../middleware/auth";

export const betsRouter = Router();

// ─── Get My Bets ──────────────────────────────────────────────────────────────
// GET /bets/my-bets
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
        b.winning_option_id,
        b.status AS status,
        br.status AS response_status,
        br.selected_option_id AS my_option_id,
        b.created_at,
        b.closes_at,
        CASE WHEN b.creator_user_id = $1 THEN true ELSE false END AS is_creator,
        COALESCE(NULLIF(TRIM(CONCAT_WS(' ', u.first_name, u.last_name)), ''), u.username) AS creator_name,
        u.username     AS creator_username,
        u.avatar_color AS creator_avatar_color,
        u.avatar_icon  AS creator_avatar_icon,
        (SELECT COUNT(*) FROM bet_responses WHERE bet_id = b.id AND status = 'accepted') AS total_joined,
        c.name         AS circle_name,
        c.icon         AS icon,
        c.icon_color   AS icon_color,
        CASE WHEN b.use_circle_coin THEN c.coin_name  END AS circle_coin_name,
        CASE WHEN b.use_circle_coin THEN c.coin_symbol END AS circle_coin_symbol,
        CASE WHEN b.use_circle_coin THEN c.coin_color  END AS circle_coin_color,
        CASE WHEN b.use_circle_coin THEN c.coin_icon   END AS circle_coin_icon,
        CASE WHEN b.post_to = 'circle' THEN 'circle' ELSE 'user' END AS target_type,
        COALESCE(NULLIF(TRIM(CONCAT_WS(' ', tu.first_name, tu.last_name)), ''), tu.username) AS target_name,
        tu.avatar_color AS target_avatar_color,
        tu.avatar_icon  AS target_avatar_icon,
        COALESCE(
          json_agg(
            json_build_object(
              'id',    bo.id,
              'label', bo.label,
              'text',  bo.option_text,
              'option_text', bo.option_text,
              'count', (
                SELECT COUNT(*) FROM bet_responses
                WHERE bet_id = b.id
                AND selected_option_id = bo.id
                AND status = 'accepted'
              )
            )
          ) FILTER (WHERE bo.id IS NOT NULL),
          '[]'
        ) AS options
      FROM bets b
      LEFT JOIN bet_options bo ON bo.bet_id = b.id
      LEFT JOIN bet_responses br ON br.bet_id = b.id AND br.user_id = $1
      LEFT JOIN users u ON u.id = b.creator_user_id
      LEFT JOIN circles c ON c.circle_id = b.target_id::uuid AND b.post_to = 'circle'
      LEFT JOIN users tu ON tu.id = b.target_id::uuid AND b.post_to = 'user'
      WHERE b.creator_user_id = $1
         OR EXISTS (
           SELECT 1 FROM bet_responses
           WHERE bet_id = b.id AND user_id = $1
         )
      GROUP BY b.id, br.status, br.selected_option_id, u.first_name, u.last_name, u.username, u.avatar_color, u.avatar_icon, c.name, c.icon, c.icon_color, c.coin_name, c.coin_symbol, c.coin_color, c.coin_icon, b.post_to, tu.first_name, tu.last_name, tu.username, tu.avatar_color, tu.avatar_icon
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
      const { title, description, stake, customStake, useCircleCoin, closesAt, options, targetType, targetId, creatorOptionIndex } = req.body;

        const idempotencyKey = req.headers["x-idempotency-key"] as string | undefined;

        if (idempotencyKey) {
          const existing = await pool.query(
            `SELECT id FROM bets WHERE idempotency_key = $1`,
            [idempotencyKey]
          );
          if (existing.rows[0]) {
            return res.status(201).json({ success: true, betId: existing.rows[0].id });
          }
        }
    const creatorUserId = req.userId;

    if (!targetType || !targetId) return res.status(400).json({ error: "Target required" });
    if (!title || !options || options.length < 2) return res.status(400).json({ error: "Missing required fields" });

    if (!stake && !customStake) return res.status(400).json({ error: "Stake or custom stake required" });

    if (stake > 0 && targetType === "circle" && useCircleCoin) {

      const balanceResult = await pool.query(
        `SELECT coin_balance FROM circle_members WHERE circle_id = $1 AND user_id = $2`,
        [targetId, creatorUserId]
      );
      const coinBalance = balanceResult.rows[0]?.coin_balance ?? 0;
      if (coinBalance < stake) {
        return res.status(400).json({ error: "Not enough circle coins", coins: coinBalance });
      }
    }

    await client.query("BEGIN");
    const betResult = await client.query(
      `INSERT INTO bets (title, description, stake_amount, custom_stake, closes_at, creator_user_id, status, post_to, target_id, idempotency_key, use_circle_coin)
         VALUES ($1, $2, $3, $4, $5, $6, 'PENDING', $7, $8, $9, $10) RETURNING id`,
        [title, description, stake ?? 0, customStake ?? null, closesAt, creatorUserId, targetType, targetId, idempotencyKey ?? null, useCircleCoin ?? false]
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

        if (creatorOptionIndex !== null && creatorOptionIndex !== undefined) {
      const optionResult = await client.query(
        `SELECT id FROM bet_options WHERE bet_id = $1 ORDER BY id LIMIT 1 OFFSET $2`,
        [betId, creatorOptionIndex]
      );
      const optionId = optionResult.rows[0]?.id;
      if (optionId) {

          if (stake > 0) {
              if (!useCircleCoin) {
                await client.query(`UPDATE users SET coins = coins - $1 WHERE id = $2`, [stake, creatorUserId]);
                await client.query(
                  `INSERT INTO coin_transactions (user_id, bet_id, amount, type) VALUES ($1, $2, $3, 'stake')`,
                  [creatorUserId, betId, -stake]
                );
              }
              if (targetType === "circle" && useCircleCoin) {
                await client.query(
                  `UPDATE circle_members SET coin_balance = coin_balance - $1 WHERE circle_id = $2 AND user_id = $3`,
                  [stake, targetId, creatorUserId]
                );
              }
            }
        await client.query(
          `INSERT INTO bet_responses (bet_id, user_id, status, selected_option_id)
           VALUES ($1, $2, 'accepted', $3)`,
          [betId, creatorUserId, optionId]
        );
      }
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


    const betResult = await client.query(`SELECT stake_amount, status, use_circle_coin FROM bets WHERE id = $1`, [betId]);

    if (!betResult.rows[0]) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Bet not found" });
    }
    if (betResult.rows[0].status !== "PENDING") {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Bet is no longer open" });
    }
    const stake = betResult.rows[0].stake_amount;
    const useCircleCoin = betResult.rows[0].use_circle_coin;
    const userResult = await client.query(`SELECT coins FROM users WHERE id = $1`, [req.userId]);
    const coins = userResult.rows[0]?.coins ?? 0;

    const targetResult = await client.query(
      `SELECT target_type, target_id FROM bet_targets WHERE bet_id = $1`,
      [betId]
    );
    const isCircleBet = targetResult.rows[0]?.target_type === "circle";
    const circleId    = targetResult.rows[0]?.target_id;

    if (stake > 0) {
  if (!useCircleCoin && coins < stake) {
    await client.query("ROLLBACK");
    return res.status(400).json({ error: "Not enough coins", coins });
  }
  if (isCircleBet && useCircleCoin) {
    const balanceResult = await client.query(
      `SELECT coin_balance FROM circle_members WHERE circle_id = $1 AND user_id = $2`,
      [circleId, req.userId]
    );
    const coinBalance = balanceResult.rows[0]?.coin_balance ?? 0;
    if (coinBalance < stake) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Not enough circle coins", coins: coinBalance });
    }
  }
}

    if (stake > 0) {
  // deduct global coins
  if (!useCircleCoin) { // or however you're determining coin type
    await client.query(
      `UPDATE users SET coins = coins - $1 WHERE id = $2`,
      [stake, req.userId]
    );
    await client.query(
      `INSERT INTO coin_transactions (user_id, bet_id, amount, type) VALUES ($1, $2, $3, 'stake')`,
      [req.userId, betId, -stake]
    );
  }
  // deduct circle coins
  if (isCircleBet && useCircleCoin) {
    await client.query(
      `UPDATE circle_members SET coin_balance = coin_balance - $1 WHERE circle_id = $2 AND user_id = $3`,
      [stake, circleId, req.userId]
    );
  }
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

// ─── Close Bet ────────────────────────────────────────────────────────────────
betsRouter.post("/:betId/close", requireAuth, async (req: AuthRequest, res) => {
  const { betId } = req.params;

  try {
    const betResult = await pool.query(
      `SELECT creator_user_id, status FROM bets WHERE id = $1`,
      [betId]
    );
    if (!betResult.rows[0]) return res.status(404).json({ error: "Bet not found" });
    if (betResult.rows[0].creator_user_id !== req.userId)
      return res.status(403).json({ error: "Only the creator can close this bet" });
    if (betResult.rows[0].status !== "PENDING")
      return res.status(400).json({ error: "Bet is not open" });

    await pool.query(`UPDATE bets SET status = 'CLOSED' WHERE id = $1`, [betId]);
    res.json({ success: true });
  } catch (err) {
    console.error("CLOSE BET ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── Settle Bet ───────────────────────────────────────────────────────────────
betsRouter.post("/:betId/settle", requireAuth, async (req: AuthRequest, res) => {
  const { betId } = req.params;
  const { winningOptionId } = req.body;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const betResult = await client.query(
      `SELECT creator_user_id, status, stake_amount, custom_stake FROM bets WHERE id = $1`,
      [betId]
    );
    if (!betResult.rows[0]) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Bet not found" });
    }
    if (betResult.rows[0].creator_user_id !== req.userId) {
      await client.query("ROLLBACK");
      return res.status(403).json({ error: "Only the creator can settle this bet" });
    }
    if (!["PENDING", "CLOSED", "PENDING_APPROVAL"].includes(betResult.rows[0].status)) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Bet cannot be settled" });
    }

    const stake = betResult.rows[0].stake_amount;
    const isCustom = !!betResult.rows[0].custom_stake;

    // Get all accepted responses
    const responses = await client.query(
      `SELECT user_id, selected_option_id FROM bet_responses WHERE bet_id = $1 AND status = 'accepted'`,
      [betId]
    );

    if (!isCustom && stake > 0) {
      const totalPot = responses.rows.length * stake;
      const winners = responses.rows.filter((r: any) => r.selected_option_id === winningOptionId);
      const winnerCount = winners.length;

      if (winnerCount > 0) {
        const payout = Math.floor(totalPot / winnerCount);
        const settleTarget = await client.query(
  `SELECT target_type, target_id FROM bet_targets WHERE bet_id = $1`,
          [betId]
        );
        const isCircleBet = settleTarget.rows[0]?.target_type === "circle";
        const circleId    = settleTarget.rows[0]?.target_id;

        for (const winner of winners) {
          await client.query(
            `UPDATE users SET coins = coins + $1 WHERE id = $2`,
            [payout, winner.user_id]
          );
          await client.query(
            `INSERT INTO coin_transactions (user_id, bet_id, amount, type) VALUES ($1, $2, $3, 'payout')`,
            [winner.user_id, betId, payout]
          );
          if (isCircleBet) {
            await client.query(
              `UPDATE circle_members SET coin_balance = coin_balance + $1 WHERE circle_id = $2 AND user_id = $3`,
              [payout, circleId, winner.user_id]
            );
          }
        }
      }
    }

    await client.query(
      `UPDATE bets SET status = 'SETTLED', winning_option_id = $1 WHERE id = $2`,
      [winningOptionId, betId]
    );

    await client.query("COMMIT");
    res.json({ success: true });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("SETTLE BET ERROR:", err);
    res.status(500).json({ error: "Server error" });
  } finally {
    client.release();
  }
});

// ─── Dispute Settled Bet ──────────────────────────────────────────────────────
betsRouter.post("/:betId/dispute", requireAuth, async (req: AuthRequest, res) => {
  const { betId } = req.params;

  try {
    const betResult = await pool.query(
      `SELECT creator_user_id, status FROM bets WHERE id = $1`,
      [betId]
    );
    if (!betResult.rows[0]) return res.status(404).json({ error: "Bet not found" });
    if (betResult.rows[0].status !== "SETTLED")
      return res.status(400).json({ error: "Only settled bets can be disputed" });
    if (betResult.rows[0].creator_user_id === req.userId)
      return res.status(403).json({ error: "Creators cannot dispute their own settlement" });

    const participation = await pool.query(
      `SELECT id FROM bet_responses WHERE bet_id = $1 AND user_id = $2 AND status = 'accepted'`,
      [betId, req.userId]
    );
    if (!participation.rows[0])
      return res.status(403).json({ error: "Only participants can dispute" });

    await pool.query(`UPDATE bets SET status = 'DISPUTED' WHERE id = $1`, [betId]);
    res.json({ success: true });
  } catch (err) {
    console.error("DISPUTE BET ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── Cancel Bet ───────────────────────────────────────────────────────────────
betsRouter.post("/:betId/cancel", requireAuth, async (req: AuthRequest, res) => {
  const { betId } = req.params;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const betResult = await client.query(
      `SELECT creator_user_id, status, stake_amount, custom_stake FROM bets WHERE id = $1`,
      [betId]
    );
    if (!betResult.rows[0]) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Bet not found" });
    }
    if (!["PENDING", "CLOSED"].includes(betResult.rows[0].status)) {
          await client.query("ROLLBACK");
          return res.status(400).json({ error: "Bet cannot be cancelled" });
        }

    if (betResult.rows[0].creator_user_id !== req.userId) {
      await client.query("ROLLBACK");
      return res.status(403).json({ error: "Only the creator can cancel this bet" });
    }

    const { stake_amount, custom_stake } = betResult.rows[0];

    if (!custom_stake && stake_amount > 0) {
      await client.query(
  `UPDATE users SET coins = coins + $1
       WHERE id IN (
         SELECT user_id FROM bet_responses
         WHERE bet_id = $2 AND status = 'accepted'
       )`,
      [stake_amount, betId]
    );
    const cancelTarget = await client.query(
      `SELECT target_type, target_id FROM bet_targets WHERE bet_id = $1`,
      [betId]
    );
    if (cancelTarget.rows[0]?.target_type === "circle") {
      await client.query(
        `UPDATE circle_members SET coin_balance = coin_balance + $1
         WHERE circle_id = $2 AND user_id IN (
           SELECT user_id FROM bet_responses WHERE bet_id = $3 AND status = 'accepted'
         )`,
        [stake_amount, cancelTarget.rows[0].target_id, betId]
      );
    }

      const participants = await client.query(
        `SELECT user_id FROM bet_responses WHERE bet_id = $1 AND status = 'accepted'`,
        [betId]
      );
      for (const p of participants.rows) {
        await client.query(
          `INSERT INTO coin_transactions (user_id, bet_id, amount, type) VALUES ($1, $2, $3, 'refund')`,
          [p.user_id, betId, stake_amount]
        );
      }
    }

    await client.query(`UPDATE bets SET status = 'CANCELLED' WHERE id = $1`, [betId]);
    await client.query("COMMIT");
    res.json({ success: true });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("CANCEL BET ERROR:", err);
    res.status(500).json({ error: "Server error" });
  } finally {
    client.release();
  }
});

// ─── Report Bet ───────────────────────────────────────────────────────────────
betsRouter.post("/:betId/report", requireAuth, async (req: AuthRequest, res) => {
  const { betId } = req.params;
  const { reason } = req.body;
  if (!reason) return res.status(400).json({ error: "Reason required" });
  try {
    const bet = await pool.query(`SELECT id FROM bets WHERE id = $1`, [betId]);
    if (!bet.rows.length) return res.status(404).json({ error: "Bet not found" });
    await pool.query(
      `INSERT INTO reports (reporter_id, target_type, target_id, reason)
       VALUES ($1, 'bet', $2, $3)`,
      [req.userId, betId, reason]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error("POST /bets/:betId/report error:", err);
    res.status(500).json({ error: "Server error" });
  }
});