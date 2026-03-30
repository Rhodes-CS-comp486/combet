import cron from "node-cron";
import { pool } from "../db";

// ─── Bet Deadline Reminder Cron ───────────────────────────────────────────────
// Runs every 15 minutes, sends a notification to all participants of bets
// closing within the next 24 hours who haven't yet been notified.

export function startBetDeadlineCron() {
  cron.schedule("*/15 * * * *", async () => {
    try {
      // Find all PENDING bets closing within the next 24 hours
      // that haven't had their 24h reminder sent yet
      const bets = await pool.query(
        `
        SELECT b.id
        FROM bets b
        WHERE b.status = 'PENDING'
          AND b.closes_at IS NOT NULL
          AND b.closes_at BETWEEN NOW() AND NOW() + INTERVAL '24 hours'
          AND NOT EXISTS (
            SELECT 1 FROM bet_deadline_notifications
            WHERE bet_id = b.id AND window_hours = 24
          )
        `
      );

      for (const bet of bets.rows) {
        const betId = bet.id;

        // Get all participants who have accepted (already joined)
        // plus the creator — exclude anyone who has already declined
        const participants = await pool.query(
          `
          SELECT DISTINCT user_id FROM (
            -- Creator
            SELECT creator_user_id AS user_id FROM bets WHERE id = $1
            UNION
            -- Accepted responders
            SELECT user_id FROM bet_responses
            WHERE bet_id = $1 AND status = 'accepted'
          ) AS all_participants
          `,
          [betId]
        );

        for (const p of participants.rows) {
          await pool.query(
            `INSERT INTO notifications
               (recipient_id, actor_id, type, entity_type, entity_id)
             VALUES ($1, NULL, 'bet_deadline', 'bet', $2)
             ON CONFLICT DO NOTHING`,
            [p.user_id, betId]
          );
        }

        // Mark this bet as notified at the 24h window so we don't spam
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

  console.log("[cron] Bet deadline reminder cron started");
}