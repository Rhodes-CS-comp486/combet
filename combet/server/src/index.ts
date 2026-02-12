import "dotenv/config";
import express from "express";
import { pool } from "./db";

const app = express();
app.use(express.json());

app.get("/", (_req, res) => {
  res.send("ComBet API is running ✅");
});

app.get("/health", async (_req, res) => {
  try {
    const r = await pool.query("SELECT NOW() as now");
    res.json({ ok: true, dbTime: r.rows[0].now });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Start server
const port = Number(process.env.PORT ?? 3001);
app.listen(port, () => console.log(`API running on http://localhost:${port}`));
