import { Router } from "express";
import { pool } from "../db";
import {AuthRequest, requireAuth} from "../middleware/auth";

export const spinRouter = Router();

const PRIZES = [
  { coins: 5,   weight: 40 },
  { coins: 10,  weight: 30 },
  { coins: 20,  weight: 20 },
  { coins: 50,  weight: 8  },
  { coins: 100, weight: 2  },
];

function pickPrize(): number {
  const total = PRIZES.reduce((s, p) => s + p.weight, 0);
  let roll = Math.random() * total;
  for (const prize of PRIZES) {
    roll -= prize.weight;
    if (roll <= 0) return prize.coins;
  }
    return 5;}

spinRouter.post("/", requireAuth, async (req, res) => {
    const userId = (req as AuthRequest).userId;
  try {
    const { rows } = await pool.query(
      `SELECT last_spin_date, coins FROM users WHERE id = $1`,
      [userId]
    );

    if (!rows.length) return res.status(404).json({ error: "User not found" });

    const today = new Date().toISOString().split("T")[0];
    const lastSpin = rows[0].last_spin_date;
    const lastSpinStr = lastSpin ? new Date(lastSpin).toISOString().split("T")[0] : null;

    if (lastSpinStr === today) {
      return res.status(400).json({ error: "Already spun today", alreadySpun: true });
    }

    const prize = pickPrize();

    const updated = await pool.query(
      `UPDATE users
       SET coins = coins + $1,
           last_spin_date = CURRENT_DATE
       WHERE id = $2
       RETURNING coins`,
      [prize, userId]
    );

    return res.json({ prize, newBalance: updated.rows[0].coins });

  } catch (err) {
    console.error("daily-spin error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});