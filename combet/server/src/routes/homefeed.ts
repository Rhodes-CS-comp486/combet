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
        c.icon_color,
        creator.username          AS creator_username,
        creator.avatar_color      AS creator_avatar_color,
        creator.avatar_icon       AS creator_avatar_icon,
        COALESCE(NULLIF(TRIM(CONCAT_WS(' ', creator.first_name, creator.last_name)), ''), creator.username) AS creator_name,
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
      JOIN bet_targets bt        ON bt.bet_id = b.id
      LEFT JOIN users creator    ON creator.id = b.creator_user_id
      LEFT JOIN users target_user
        ON bt.target_type = 'user'
        AND target_user.id = bt.target_id
      LEFT JOIN circles c
        ON bt.target_type = 'circle'
        AND c.circle_id = bt.target_id
      LEFT JOIN bet_options bo   ON bo.bet_id = b.id
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
          SELECT bet_id FROM bet_responses WHERE user_id = $1
        )
        AND b.status = 'PENDING'
      GROUP BY
        b.id,
        b.custom_stake,
        creator.username,
        creator.first_name,
        creator.last_name,
        creator.avatar_color,
        creator.avatar_icon,
        bt.target_type,
        c.name,
        c.icon,
        c.icon_color,
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

// GET /homefeed/active
homefeedRouter.get("/active", requireAuth, async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        b.id,
        b.title,
        b.description,
        b.created_at,
        b.closes_at,
        b.stake_amount,
        b.custom_stake,
        b.status,
        b.winning_option_id,
        b.proposed_winner_option_id,
        b.creator_user_id = $1 AS is_creator,
        CASE
          WHEN bt.target_type = 'circle' THEN COALESCE(c.icon, 'ellipse-outline')
          WHEN bt.target_type = 'user'   THEN 'people-outline'
          ELSE 'ellipse-outline'
        END AS icon,
        c.icon_color,
        creator.username AS creator_username,
        creator.avatar_color AS creator_avatar_color,
        creator.avatar_icon AS creator_avatar_icon,
        target_user.avatar_color AS target_avatar_color,
        target_user.avatar_icon AS target_avatar_icon,
        c.icon_color AS circle_icon_color,
        bt.target_type,
        CASE
          WHEN bt.target_type = 'circle' THEN c.name
          WHEN bt.target_type = 'user'   THEN target_user.username
        END AS target_name,
        COUNT(DISTINCT br_all.user_id) AS total_joined,
        b.stake_amount * COUNT(DISTINCT br_all.user_id) AS pot,
        my_response.selected_option_id AS my_option_id,
        (SELECT approve FROM bet_winner_votes WHERE bet_id = b.id AND user_id = $1) AS my_vote,
        (SELECT COUNT(*) FILTER (WHERE approve = true) FROM bet_winner_votes WHERE bet_id = b.id) AS approval_count,
        (SELECT COUNT(*) FROM bet_winner_votes WHERE bet_id = b.id) AS total_votes,
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
      LEFT JOIN bet_responses my_response
        ON my_response.bet_id = b.id
        AND my_response.user_id = $1
        AND my_response.status = 'accepted'
      WHERE
        (b.creator_user_id = $1
        OR my_response.user_id = $1)
        AND b.status IN ('PENDING', 'CLOSED', 'PENDING_APPROVAL', 'DISPUTED', 'SETTLED')
      GROUP BY
        b.id,
        b.custom_stake,
        b.winning_option_id,
        b.creator_user_id,
        creator.username,
        creator.avatar_color,
        creator.avatar_icon,
        bt.target_type,
        c.name,
        c.icon,
        c.icon_color,
        target_user.avatar_color,
        target_user.avatar_icon,
        target_user.username,
        my_response.selected_option_id
      ORDER BY b.created_at DESC
      `,
      [req.userId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("ACTIVE BETS ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /homefeed/recent-results
homefeedRouter.get("/recent-results", requireAuth, async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        b.id,
        b.title,
        b.stake_amount,
        b.custom_stake,
        b.winning_option_id,
        b.created_at,
        my_response.selected_option_id AS my_option_id,
        (SELECT option_text FROM bet_options WHERE id = b.winning_option_id) AS winning_option_text,
        COUNT(DISTINCT br_all.user_id) AS total_joined,
        (SELECT COUNT(*) FROM bet_responses 
         WHERE bet_id = b.id AND selected_option_id = b.winning_option_id AND status = 'accepted') AS winner_count,
        b.creator_user_id = $1 AS is_creator,
        bt.target_type,
        creator.username AS creator_username,
        creator.avatar_color AS creator_avatar_color,
        creator.avatar_icon AS creator_avatar_icon,
        target_user.avatar_color AS target_avatar_color,
        target_user.avatar_icon AS target_avatar_icon,
        COALESCE(c.icon, 'people') AS circle_icon,
        c.icon_color AS circle_icon_color,
        CASE
          WHEN bt.target_type = 'circle' THEN c.name
          WHEN bt.target_type = 'user' THEN target_user.username
        END AS target_name
      FROM bets b
      JOIN bet_targets bt ON bt.bet_id = b.id
      LEFT JOIN users creator ON creator.id = b.creator_user_id
      LEFT JOIN users target_user ON bt.target_type = 'user' AND target_user.id = bt.target_id
      LEFT JOIN circles c ON bt.target_type = 'circle' AND c.circle_id = bt.target_id
      
      LEFT JOIN bet_responses my_response
        ON my_response.bet_id = b.id
        AND my_response.user_id = $1
        AND my_response.status = 'accepted'
      LEFT JOIN bet_responses br_all
        ON br_all.bet_id = b.id
        AND br_all.status = 'accepted'
      WHERE
        (b.creator_user_id = $1 OR my_response.user_id = $1)
        AND b.status = 'SETTLED'
      GROUP BY b.id, b.creator_user_id, my_response.selected_option_id, creator.username, creator.avatar_color, creator.avatar_icon, bt.target_type, c.name, c.icon, c.icon_color, target_user.username, target_user.avatar_color, target_user.avatar_icon
      ORDER BY b.updated_at DESC
      LIMIT 5
      `,
      [req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("RECENT RESULTS ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});