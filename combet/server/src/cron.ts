import cron from "node-cron";
import { pool } from "./db";
import { userWantsNotification } from "./routes/notificationPrefs";
import { userWantsNotification } from "./routes/notificationPrefs";

export function startCronJobs() {

  // ── Auto-close / cancel expired bets (every hour) ──────────────────────────
  setInterval(async () => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const underparticipated = await client.query(
        `SELECT b.id, b.stake_amount, b.custom_stake
         FROM bets b
         WHERE b.status = 'PENDING'
           AND b.closes_at IS NOT NULL
           AND b.closes_at < NOW()
           AND (
             SELECT COUNT(*) FROM bet_responses
             WHERE bet_id = b.id AND status = 'accepted'
           ) < 2`
      );

      for (const bet of underparticipated.rows) {
        if (!bet.custom_stake && bet.stake_amount > 0) {
          await client.query(
            `UPDATE users SET coins = coins + $1
             WHERE id IN (
               SELECT user_id FROM bet_responses
               WHERE bet_id = $2 AND status = 'accepted'
             )`,
            [bet.stake_amount, bet.id]
          );
        }
        await client.query(
          `UPDATE bets SET status = 'CANCELLED' WHERE id = $1`,
          [bet.id]
        );
      }

      if (underparticipated.rowCount && underparticipated.rowCount > 0) {
        console.log(`Auto-cancelled ${underparticipated.rowCount} bet(s) with insufficient participants`);
      }

      const closed = await client.query(
        `UPDATE bets SET status = 'CLOSED'
         WHERE status = 'PENDING'
           AND closes_at IS NOT NULL
           AND closes_at < NOW()
           AND (
             SELECT COUNT(*) FROM bet_responses
             WHERE bet_id = bets.id AND status = 'accepted'
           ) >= 2
         RETURNING id`
      );

      if (closed.rowCount && closed.rowCount > 0) {
        console.log(`Auto-closed ${closed.rowCount} bet(s)`);
      }

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      console.error("CRON ERROR:", err);
    } finally {
      client.release();
    }
  }, 60 * 60 * 1000);

  // ── 24h deadline reminders (every 15 minutes) ──────────────────────────────
  cron.schedule("*/15 * * * *", async () => {
    try {
      const bets = await pool.query(
        `SELECT b.id
         FROM bets b
         WHERE b.status = 'PENDING'
           AND b.closes_at IS NOT NULL
           AND b.closes_at BETWEEN NOW() AND NOW() + INTERVAL '24 hours'
           AND NOT EXISTS (
             SELECT 1 FROM bet_deadline_notifications
             WHERE bet_id = b.id AND window_hours = 24
           )`
      );

      for (const bet of bets.rows) {
        const betId = bet.id;

        const participants = await pool.query(
          `SELECT DISTINCT user_id FROM (
             SELECT creator_user_id AS user_id FROM bets WHERE id = $1
             UNION
             SELECT user_id FROM bet_responses
             WHERE bet_id = $1 AND status = 'accepted'
           ) AS all_participants`,
          [betId]
        );

        for (const p of participants.rows) {
          if (await userWantsNotification(p.user_id, "notify_bet_deadline")) {
            await pool.query(
              `INSERT INTO notifications
                 (recipient_id, actor_id, type, entity_type, entity_id)
               VALUES ($1, NULL, 'bet_deadline', 'bet', $2)
               ON CONFLICT DO NOTHING`,
              [p.user_id, betId]
            );
          }
        }

        await pool.query(
          `INSERT INTO bet_deadline_notifications (bet_id, window_hours)
           VALUES ($1, 24) ON CONFLICT DO NOTHING`,
          [betId]
        );
      }

      if (bets.rows.length > 0) {
        console.log(`[cron] Sent 24h deadline reminders for ${bets.rows.length} bet(s)`);
      }
    } catch (err) {
      console.error("[cron] Bet deadline cron error:", err);
    }
  });

  console.log("Cron jobs started");
}