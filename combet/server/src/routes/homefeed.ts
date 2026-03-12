import { Router } from "express";
import { pool } from "../db";
import { requireAuth, AuthRequest } from "../middleware/auth";

export const homefeedRouter = Router();

// GET /homefeed/home
homefeedRouter.get("/home", requireAuth, async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        b.id,
        b.title,
        b.description,
        b.created_at,
        b.stake_amount,
        b.custom_stake,
        b.status,
        CASE
          WHEN bt.target_type = 'circle' THEN COALESCE(c.icon, 'ellipse-outline')
          WHEN bt.target_type = 'user'   THEN 'people-outline'
          ELSE 'ellipse-outline'
        END AS icon,
        creator.username AS creator_username,
        bt.target_type,
        CASE
          WHEN bt.target_type = 'circle' THEN c.name
          WHEN bt.target_type = 'user'   THEN target_user.username
        END AS target_name,
        COUNT(DISTINCT br_all.user_id) AS total_joined,
        b.stake_amount * COUNT(DISTINCT br_all.user_id) AS pot,
        json_agg(
          DISTINCT jsonb_build_object(
            'id',    bo.id,
            'label', bo.label,
            'text',  bo.option_text,
            'count', (
              SELECT COUNT(*) FROM bet_responses
              WHERE bet_id = b.id
              AND selected_option_id = bo.id
              AND status = 'accepted'
            )
          )
        ) FILTER (WHERE bo.id IS NOT NULL) AS options
      FROM bets b
      JOIN bet_targets bt       ON bt.bet_id = b.id
      LEFT JOIN users creator   ON creator.id = b.creator_user_id
      LEFT JOIN users target_user
        ON bt.target_type = 'user'
        AND target_user.id = bt.target_id
      LEFT JOIN circles c
        ON bt.target_type = 'circle'
        AND c.circle_id = bt.target_id
      LEFT JOIN bet_options bo  ON bo.bet_id = b.id
          LEFT JOIN bet_responses br_all
        ON br_all.bet_id = b.id
        AND br_all.status = 'accepted'
      LEFT JOIN circle_members cm
        ON bt.target_type = 'circle'
        AND cm.circle_id = bt.target_id
        AND cm.user_id = $1
        AND cm.status = 'accepted'
      WHERE
        ((bt.target_type = 'user'   AND bt.target_id = $1)
        OR
        (bt.target_type = 'circle' AND cm.user_id IS NOT NULL))
        AND b.id NOT IN (
        SELECT bet_id FROM bet_responses WHERE user_id = $1)
       GROUP BY
        b.id,
        b.custom_stake,
        creator.username,
        bt.target_type,
        c.name,
        c.icon,
        target_user.username
      ORDER BY b.created_at DESC
      `,
      [req.userId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("HOMEFEED ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});