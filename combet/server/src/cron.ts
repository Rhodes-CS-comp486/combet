import { pool } from "./db";

export function startCronJobs() {
  setInterval(async () => {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");

        // Find expired PENDING bets with fewer than 2 participants
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
          // Refund anyone who joined
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

        // Auto-close bets that have enough participants
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

  console.log("Cron jobs started");
}