import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { pool } from "./db";
import { authRouter } from "./routes/auth";


dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use("/auth", authRouter);

/**
 * CREATE CIRCLE
 */
app.post("/circles", async (req, res) => {
  const { name, description, icon } = req.body;

  if (!name || name.length < 5 || name.length > 15) {
    return res.status(400).json({ error: "Name must be 5–15 characters" });
  }

  if (description && description.length > 100) {
    return res.status(400).json({ error: "Description max 100 characters" });
  }

  try {
    const result = await pool.query(
      `
      INSERT INTO circles (name, description, icon)
      VALUES ($1, $2, $3)
      RETURNING circle_id, name, description, icon, created_at
      `,
      [name, description, icon]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * GET ALL CIRCLES
 */
app.get("/circles", async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT circle_id, name, description, icon FROM circles ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});



const PORT = 3001;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
