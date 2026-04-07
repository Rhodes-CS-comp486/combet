import { Router } from "express";
import { pool } from "../db";
import { requireAuth, AuthRequest } from "../middleware/auth";

export const leaderboardRouter = Router();

// GET /leaderboard?period=week|month|alltime
leaderboardRouter.get("/", requireAuth, async (req: AuthRequest, res) => {
  const userId = req.userId;
  const period = (req.query.period as string) ?? "week";

  const intervalMap: Record<string, string> = {
    week:    "7 days",
    month:   "30 days",
    alltime: "100 years",
  };
  const interval = intervalMap[period] ?? "7 days";

  try {
    // ── Scoped user pool: people who share a circle with the current user ──
    // ── Coins won/lost this period ────────────────────────────────────────
    const coinsRanking = await pool.query(
      `
      WITH circle_peers AS (
        SELECT DISTINCT cm2.user_id
        FROM circle_members cm1
        JOIN circle_members cm2 ON cm1.circle_id = cm2.circle_id
        WHERE cm1.user_id = $1
          AND cm2.status = 'accepted'
      ),
      prev_period AS (
        SELECT
          ct.user_id,
          COALESCE(SUM(ct.amount) FILTER (WHERE ct.type = 'payout'), 0) AS prev_coins_won
        FROM coin_transactions ct
        WHERE ct.created_at >= NOW() - INTERVAL '${interval}' * 2
          AND ct.created_at <  NOW() - INTERVAL '${interval}'
          AND ct.user_id IN (SELECT user_id FROM circle_peers)
        GROUP BY ct.user_id
      )
      SELECT
        u.id,
        COALESCE(NULLIF(TRIM(CONCAT_WS(' ', u.first_name, u.last_name)), ''), u.username) AS display_name,
        u.avatar_color,
        u.avatar_icon,
        COALESCE(SUM(ct.amount) FILTER (WHERE ct.type = 'payout'), 0) AS coins_won,
        COALESCE(SUM(ABS(ct.amount)) FILTER (WHERE ct.type = 'stake'), 0) AS coins_staked,
        COALESCE(pp.prev_coins_won, 0) AS prev_coins_won
      FROM users u
      JOIN circle_peers cp ON cp.user_id = u.id
      LEFT JOIN coin_transactions ct
        ON ct.user_id = u.id
        AND ct.created_at >= NOW() - INTERVAL '${interval}'
      LEFT JOIN prev_period pp ON pp.user_id = u.id
      GROUP BY u.id, u.first_name, u.last_name, u.username,
               u.avatar_color, u.avatar_icon, pp.prev_coins_won
      ORDER BY coins_won DESC
      `,
      [userId]
    );

    // ── Win/loss counts + streaks per user ────────────────────────────────
    const wlStats = await pool.query(
      `
      WITH circle_peers AS (
        SELECT DISTINCT cm2.user_id
        FROM circle_members cm1
        JOIN circle_members cm2 ON cm1.circle_id = cm2.circle_id
        WHERE cm1.user_id = $1
          AND cm2.status = 'accepted'
      ),
      settled AS (
        SELECT
          br.user_id,
          CASE WHEN br.selected_option_id = b.winning_option_id THEN 'W' ELSE 'L' END AS result,
          b.updated_at AS settled_at
        FROM bet_responses br
        JOIN bets b ON b.id = br.bet_id
        WHERE b.status = 'SETTLED'
          AND br.status = 'accepted'
          AND br.user_id IN (SELECT user_id FROM circle_peers)
          AND b.updated_at >= NOW() - INTERVAL '${interval}'
      ),
      streak_calc AS (
        SELECT
          user_id,
          result,
          ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY settled_at DESC) AS rn,
          ROW_NUMBER() OVER (PARTITION BY user_id, result ORDER BY settled_at DESC) AS grp
        FROM settled
      ),
      current_streaks AS (
        SELECT user_id, result, COUNT(*) AS streak
        FROM streak_calc
        WHERE rn = grp
        GROUP BY user_id, result
      )
      SELECT
        s.user_id,
        COUNT(*) FILTER (WHERE s.result = 'W') AS wins,
        COUNT(*) FILTER (WHERE s.result = 'L') AS losses,
        MAX(cs_w.streak) AS win_streak,
        MAX(cs_l.streak) AS loss_streak
      FROM settled s
      LEFT JOIN current_streaks cs_w ON cs_w.user_id = s.user_id AND cs_w.result = 'W'
      LEFT JOIN current_streaks cs_l ON cs_l.user_id = s.user_id AND cs_l.result = 'L'
      GROUP BY s.user_id
      `,
      [userId]
    );

    // ── Most bets placed ──────────────────────────────────────────────────
    const mostBets = await pool.query(
      `
      WITH circle_peers AS (
        SELECT DISTINCT cm2.user_id
        FROM circle_members cm1
        JOIN circle_members cm2 ON cm1.circle_id = cm2.circle_id
        WHERE cm1.user_id = $1 AND cm2.status = 'accepted'
      )
      SELECT br.user_id, COUNT(*) AS bets_placed
      FROM bet_responses br
      JOIN bets b ON b.id = br.bet_id
      WHERE br.status = 'accepted'
        AND br.user_id IN (SELECT user_id FROM circle_peers)
        AND b.created_at >= NOW() - INTERVAL '${interval}'
      GROUP BY br.user_id
      ORDER BY bets_placed DESC
      LIMIT 1
      `,
      [userId]
    );

    // ── Circle rankings by coins wagered ──────────────────────────────────
    const circleRankings = await pool.query(
      `
      SELECT
        c.circle_id,
        c.name,
        c.icon,
        c.icon_color,
        COUNT(DISTINCT b.id)       AS bet_count,
        COUNT(DISTINCT cm.user_id) AS member_count,
        COALESCE(SUM(b.stake_amount) FILTER (
          WHERE b.id IS NOT NULL
            AND b.stake_amount > 0
            AND b.custom_stake IS NULL
        ), 0) AS coins_wagered
      FROM circles c
      JOIN circle_members cm ON cm.circle_id = c.circle_id AND cm.status = 'accepted'
      JOIN circle_members my_mem ON my_mem.circle_id = c.circle_id AND my_mem.user_id = $1
      LEFT JOIN bets b ON b.target_id::uuid = c.circle_id
        AND b.post_to = 'circle'
        AND b.created_at >= NOW() - INTERVAL '${interval}'
      GROUP BY c.circle_id, c.name, c.icon, c.icon_color
      ORDER BY coins_wagered DESC, bet_count DESC, member_count DESC
      `,
      [userId]
    );

    // ── Merge coins + wl stats ────────────────────────────────────────────
    const wlMap = new Map(wlStats.rows.map((r: any) => [r.user_id, r]));
    const mostBetsUserId = mostBets.rows[0]?.user_id;

    const ranked = coinsRanking.rows.map((u: any, i: number) => {
      const wl = (wlMap.get(u.id) as any) ?? {};
      const prevCoins = Number(u.prev_coins_won);
      const currCoins = Number(u.coins_won);
      const pctChange = prevCoins > 0
        ? Math.round(((currCoins - prevCoins) / prevCoins) * 100)
        : null;

      return {
        rank:          i + 1,
        id:            u.id,
        is_me:         u.id === userId,
        display_name:  u.display_name,
        avatar_color:  u.avatar_color,
        avatar_icon:   u.avatar_icon,
        coins_won:     currCoins,
        coins_staked:  Number(u.coins_staked),
        wins:          Number(wl.wins ?? 0),
        losses:        Number(wl.losses ?? 0),
        win_streak:    Number(wl.win_streak ?? 0),
        loss_streak:   Number(wl.loss_streak ?? 0),
        pct_change:    pctChange,
        most_bets:     u.id === mostBetsUserId,
      };
    });

    console.log("ranked:", ranked.length, "circles:", circleRankings.rows.length);
    console.log("coinsRanking rows:", coinsRanking.rows.length);
    res.json({
      period,
      users:   ranked,
      circles: circleRankings.rows.map((c: any) => ({
        circle_id:     c.circle_id,
        name:          c.name,
        icon:          c.icon,
        icon_color:    c.icon_color,
        bet_count:     Number(c.bet_count),
        member_count:  Number(c.member_count),
        coins_wagered: Number(c.coins_wagered),
      })),
    });

  } catch (err) {
    console.error("GET /leaderboard error:", err);
    res.status(500).json({ error: "Server error" });
  }
});