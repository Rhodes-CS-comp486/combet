import { pool } from "./db";

export function startCronJobs() {
  // Run every hour
  setInterval(async () => {
    try {
      const result = await pool.query(
        `UPDATE bets SET status = 'CLOSED'
         WHERE status = 'PENDING'
         AND closes_at IS NOT NULL
         AND closes_at < NOW()`
      );
      if (result.rowCount && result.rowCount > 0) {
        console.log(`Auto-closed ${result.rowCount} bet(s)`);
      }
    } catch (err) {
      console.error("CRON ERROR:", err);
    }
  }, 60 * 60 * 1000); // every hour

  console.log("Cron jobs started");
}