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

/**
 * CREATE BET (basic version)
 */
/**
 * CREATE BET (full version)
 */
app.post("/bets", async (req, res) => {
  const client = await pool.connect();

  try {
      const sessionId = req.header("x-session-id");
    if (!sessionId) {
      return res.status(401).json({ error: "Missing session" });
    }
    const {
      title,
      description,
      stake,
      closesAt,
      //creatorUserId,
      options,
      targetType,
      targetId
    } = req.body;

    if (
      !title ||
      !description ||
      !stake ||
      //!creatorUserId ||
      !options ||
      options.length < 2 ||
      !targetType ||
      !targetId
    ) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    await client.query("BEGIN");

    const userResult = await client.query(
      `
      SELECT u.id
      FROM sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.session_id = $1
      `,
      [sessionId]
    );

    if (userResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(401).json({ error: "Invalid session" });
    }

    const creatorUserId = userResult.rows[0].id;

    // 1️⃣ Insert into bets
    const betResult = await client.query(


      `
      INSERT INTO bets (title, description, stake_amount, closes_at, creator_user_id, status)
      VALUES ($1, $2, $3, $4, $5, 'PENDING')
      RETURNING id
      `,
      [title, description, stake, closesAt, creatorUserId]
    );

    const betId = betResult.rows[0].id;

    // 2️⃣ Insert bet options
    for (let i = 0; i < options.length; i++) {
      await client.query(
        `
        INSERT INTO bet_options (bet_id, label, option_text)
        VALUES ($1, $2, $3)
        `,
        [betId, String.fromCharCode(65 + i), options[i]]
      );
    }

    // 3️⃣ Insert bet target
    //await client.query(
      //`
      //INSERT INTO bet_targets (bet_id, target_type, target_id)
      //VALUES ($1, $2, $3)
      //`,
      //[betId, targetType, targetId]
    //);

    await client.query("COMMIT");

    res.status(201).json({ success: true, betId });

  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Create bet error:", error);
    res.status(500).json({ error: "Failed to create bet" });
  } finally {
    client.release();
  }
});



const PORT = 3001;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
