console.log("INDEX FILE LOADED");

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { pool } from "./db";
import { authRouter } from "./routes/auth";


dotenv.config();

const app = express();

app.use(cors());

app.use((req, res, next) => {
  console.log("ROUTE HIT:", req.method, req.url);
  next();
});

app.use(express.json());
app.use("/auth", authRouter);

// gets user_id from sessions
async function getUserIdFromSession(sessionId: string): Promise<string | null> {
  const result = await pool.query(
    `
    SELECT u.id
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.session_id = $1
    `,
    [sessionId]
  );

  return result.rows.length ? result.rows[0].id : null;
}

/**
 * CREATE CIRCLE
 */
app.post("/circles", async (req, res) => {
  console.log("BODY:", req.body); // testing
  const { name, description, icon } = req.body;
  const sessionId = req.headers["session-id"];
  console.log("SESSION HEADER:", sessionId); // testing

  // Get user from session
  const sessionResult = await pool.query(
    `SELECT user_id FROM sessions WHERE session_id = $1`,
    [sessionId]
  );

  const userId = sessionResult.rows[0]?.user_id;

  if (!userId) {
    return res.status(400).json({ error: "Missing user id" });
  }

  if (!name || name.length < 5 || name.length > 15) {
    return res.status(400).json({ error: "Name must be 5-15 characters" });
  }

  if (description && description.length > 100) {
    return res.status(400).json({ error: "Description max 100 characters" });
  }

  try {
    // 1️⃣ Insert circle
    const circleResult = await pool.query(
      `
      INSERT INTO circles (name, description, icon)
      VALUES ($1, $2, $3)
      RETURNING circle_id
      `,
      [name, description, icon]
    );

    const circleId = circleResult.rows[0].circle_id;

    // 2️⃣ Insert creator as ACCEPTED (not pending)
    await pool.query(
      `
      INSERT INTO circle_members (circle_id, user_id, status)
      VALUES ($1, $2, 'accepted')
      `,
      [circleId, userId]
    );

    res.status(201).json({ circle_id: circleId });

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

        `SELECT c.*
            FROM circles c
            JOIN circle_members cm
            ON cm.circle_id = c.circle_id
            WHERE cm.user_id = $1;`
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

    if (!targetType || !targetId) {
      return res.status(400).json({ error: "Target required" });
    }


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
      INSERT INTO bets (title, description, stake_amount, closes_at, creator_user_id, status, post_to, target_id)
      VALUES ($1, $2, $3, $4, $5, 'PENDING', $6, $7)
      RETURNING id
      `,
      [title, description, stake, closesAt, creatorUserId, targetType, targetId, ]
    );

    const betId = betResult.rows[0].id;

    await client.query(
  `
      INSERT INTO bet_targets (bet_id, target_type, target_id)
      VALUES ($1, $2, $3)
      `,
      [betId, targetType, targetId]
    );

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

/**
 * gets all users and circles
 */
app.get("/search", async (req, res) => {
    console.log("SEARCH ROUTE HIT");
    try {
    const sessionId = req.header("x-session-id");
    if (!sessionId) return res.status(401).json({ error: "Missing session" });

    const currentUserId = await getUserIdFromSession(sessionId);
    if (!currentUserId) return res.status(401).json({ error: "Invalid session" });

    const q = String(req.query.q ?? "").trim();
    if (!q) return res.json([]);

    const result = await pool.query(
      `
      -- USERS
      SELECT
        'user' AS type,
        u.id::text AS id,
        COALESCE(
  NULLIF(TRIM(CONCAT_WS(' ', u.first_name, u.last_name)), ''), u.username) AS label,
        u.username AS subtitle,
        CASE WHEN f.follower_id IS NULL THEN false ELSE true END AS "isFriend"
      FROM users u
      LEFT JOIN follows f
        ON f.following_id = u.id
       AND f.follower_id = $1
      WHERE u.id <> $1
        AND (
          u.username ILIKE '%' || $2 || '%'
          OR COALESCE(u.first_name,'') ILIKE '%' || $2 || '%'
          OR COALESCE(u.last_name,'') ILIKE '%' || $2 || '%'
        )

      UNION ALL

      -- CIRCLES
      SELECT
        'circle' AS type,
        c.circle_id::text AS id,
        c.name AS label,
        COALESCE(c.description,'') AS subtitle,
        NULL::boolean AS "isFriend"
      FROM circles c
      WHERE c.name ILIKE '%' || $2 || '%'

      ORDER BY label
      LIMIT 50
      `,
      [currentUserId, q]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("GET /search error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * create follows from users
 */
app.post("/follows", async (req, res) => {
  try {
    const sessionId = req.header("x-session-id");
    if (!sessionId) return res.status(401).json({ error: "Missing session" });

    const currentUserId = await getUserIdFromSession(sessionId);
    if (!currentUserId) return res.status(401).json({ error: "Invalid session" });

    const { followingId } = req.body;
    if (!followingId) return res.status(400).json({ error: "followingId required" });
    if (followingId === currentUserId)
      return res.status(400).json({ error: "Cannot follow yourself" });

    await pool.query(
      `
      INSERT INTO follows (follower_id, following_id)
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING
      `,
      [currentUserId, followingId]
    );

    res.json({ ok: true });
  } catch (err) {
    console.error("POST /follows error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * displays circles for that user
 */
app.get("/circles/my", async (req, res) => {
  const sessionId =
  req.header("x-session-id") || req.header("user-id");

  if (!sessionId) {
    return res.status(400).json({ error: "Missing session id" });
  }

  try {
    // Get user_id from sessions table
    const sessionResult = await pool.query(
      `SELECT user_id FROM sessions WHERE session_id = $1`,
      [sessionId]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(401).json({ error: "Invalid session" });
    }

    const userId = sessionResult.rows[0].user_id;

    // Now use actual user_id
    const circlesResult = await pool.query(
      `
      SELECT c.circle_id, c.name, c.icon
      FROM circles c
      JOIN circle_members m ON m.circle_id = c.circle_id
      WHERE m.user_id = $1
      `,
      [userId]
    );

    res.json(circlesResult.rows);

  } catch (err) {
    console.error(err);
    res.status(200).json({ success: true });
  }
});

app.get("/friends/my", async (req, res) => {
  const sessionId = req.header("x-session-id");
  if (!sessionId) return res.status(401).json({ error: "Missing session" });

  const userId = await getUserIdFromSession(sessionId);
  if (!userId) return res.status(401).json({ error: "Invalid session" });

  const result = await pool.query(
    `
    SELECT u.id, u.username AS name
    FROM follows f
    JOIN users u ON u.id = f.following_id
    WHERE f.follower_id = $1
    `,
    [userId]
  );

  res.json(result.rows);
});
/**
 * GET SINGLE CIRCLE
 */
app.get("/circles/:circleId", async (req, res) => {
  const { circleId } = req.params;

  try {
    const result = await pool.query(
      "SELECT * FROM circles WHERE circle_id = $1",
      [circleId]
    );

    if (result.rows.length === 0) {
      return res.status(404).send("Circle not found");
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(200).json({ success: true });
  }
});

/**
 * UPDATE CIRCLE
 */
app.put("/circles/:circleId", async (req, res) => {
  const { circleId } = req.params;
  const { name, description, icon } = req.body;

  if (!name || name.length < 5 || name.length > 15) {
    return res.status(400).json({ error: "Name must be 5–15 characters" });
  }

  if (description && description.length > 100) {
    return res.status(400).json({ error: "Description max 100 characters" });
  }
 // update the circle from edit circle profile
  try {
    const result = await pool.query(
      `
      UPDATE circles
      SET name = $1,
          description = $2,
          icon = $3
      WHERE circle_id = $4
      RETURNING circle_id, name, description, icon
      `,
      [name, description, icon, circleId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Circle not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("PUT circle error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * see members of a circle
 */
app.get("/circles/:id/members", async (req, res) => {
  const circleId = req.params.id;
 // see members of the circle were they have also accepted the invite
  try {
    const result = await pool.query(
      `
      SELECT u.id, u.username
      FROM circle_members cm
      JOIN users u ON cm.user_id = u.id
      WHERE cm.circle_id = $1
      AND cm.status = 'accepted'
      `,
      [circleId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching members:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * search friends to add to a circle
 * someone who is requested by a user in a circle will show as requested by another user
 */
app.get("/circles/:circleId/search-friends", async (req, res) => {
  const { circleId } = req.params;
  const sessionId = req.headers["session-id"];
  const query = req.query.q;

  const userResult = await pool.query(
    `SELECT user_id FROM sessions WHERE session_id = $1`,
    [sessionId]
  );

  const currentUserId = userResult.rows[0]?.user_id;
  const result = await pool.query(
    ` SELECT 
  u.id,
  u.username,
  cm.status AS member_status,
  ci.status AS invite_status, 
  ci.inviter_id
FROM follows f
JOIN users u ON u.id = f.following_id

LEFT JOIN circle_members cm
  ON cm.user_id = u.id
  AND cm.circle_id = $2

LEFT JOIN circle_invites ci
  ON ci.invitee_id = u.id
  AND ci.circle_id = $2
  AND ci.status = 'pending'

WHERE f.follower_id = $1
AND u.username ILIKE $3`,
    [currentUserId, circleId, `%${query}%`]
  );

  const normalized = result.rows.map(row => {
  let status: "accepted" | "pending" | null = null;
  let invitedByMe = false;

  if (row.member_status === "accepted") {
    status = "accepted";
  } else if (row.invite_status === "pending") {
    status = "pending";
    invitedByMe = row.inviter_id === currentUserId;
  }

  return {
    id: row.id,
    username: row.username,
    status,
    invitedByMe
  };
});

res.json(normalized);
});

/**
 * invite friends to a circle
 */
app.post("/circles/:circleId/invite", async (req, res) => {
  const { circleId } = req.params;
  const { inviteeId } = req.body;
  const sessionId = req.headers["session-id"];

  if (!sessionId) return res.status(401).json({ error: "Not authenticated" });

  const session = await pool.query(
    "SELECT user_id FROM sessions WHERE session_id = $1",
    [sessionId]
  );

  if (!session.rows.length)
    return res.status(401).json({ error: "Invalid session" });

  const inviterId = session.rows[0].user_id;

  // prevent duplicate pending invite
  const existing = await pool.query(
    `
    SELECT 1 FROM circle_invites
    WHERE circle_id = $1
    AND invitee_id = $2
    AND status = 'pending'
    `,
    [circleId, inviteeId]
  );

  if (existing.rows.length)
    return res.status(400).json({ error: "Already invited" });

  // create invite
  const invite = await pool.query(
    `
    INSERT INTO circle_invites
    (circle_id, inviter_id, invitee_id, status)
    VALUES ($1, $2, $3, 'pending')
    RETURNING invite_id
    `,
    [circleId, inviterId, inviteeId]
  );

  const inviteId = invite.rows[0].invite_id;

  // create notification referencing invite_id
  await pool.query(
    `
    INSERT INTO notifications
    (recipient_id, actor_id, type, entity_type, entity_id)
    VALUES ($1, $2, 'circle_invite', 'circle_invite', $3)
    `,
    [inviteeId, inviterId, inviteId]
  );

  res.json({ success: true, inviteId });
});

/**
 * this retracts an invite if the original inviter retracts the invite
 */
app.delete("/circles/:circleId/retract/:inviteeId", async (req, res) => {
  const { circleId, inviteeId } = req.params;
  const sessionId = req.headers["session-id"];

  if (!sessionId)
    return res.status(401).json({ error: "Not authenticated" });

  const session = await pool.query(
    "SELECT user_id FROM sessions WHERE session_id = $1",
    [sessionId]
  );

  if (!session.rows.length)
    return res.status(401).json({ error: "Invalid session" });

  const currentUserId = session.rows[0].user_id;

  // Get invite_id first
  const invite = await pool.query(
    `
    SELECT invite_id
    FROM circle_invites
    WHERE circle_id = $1
    AND invitee_id = $2
    AND inviter_id = $3
    AND status = 'pending'
    `,
    [circleId, inviteeId, currentUserId]
  );

  if (!invite.rows.length) {
    return res.status(403).json({ error: "Cannot retract this invite" });
  }

  const inviteId = invite.rows[0].invite_id;

  // Delete invite
  await pool.query(
    `
    DELETE FROM circle_invites
    WHERE invite_id = $1
    `,
    [inviteId]
  );

  // Delete matching notification
  await pool.query(
    `
    DELETE FROM notifications
    WHERE recipient_id = $1
    AND entity_id = $2
    AND entity_type = 'circle_invite'
    `,
    [inviteeId, inviteId]
  );

  res.json({ success: true });
});


/**
 * add invite to inbox
 */
app.get("/inbox", async (req, res) => {
  const sessionId = req.headers["session-id"];
  if (!sessionId) return res.status(401).json({ error: "Not authenticated" });

  const session = await pool.query(
    "SELECT user_id FROM sessions WHERE session_id = $1",
    [sessionId]
  );

  if (!session.rows.length)
    return res.status(401).json({ error: "Invalid session" });

  const userId = session.rows[0].user_id;

  const result = await pool.query(
    `
  SELECT 
    n.notification_id,
    n.type,
    n.entity_id,
    n.is_read,
    n.created_at,
    u.username AS actor_username,
    c.name AS circle_name,
    ci.invite_id,
    ci.status
  FROM notifications n
  JOIN circle_invites ci
    ON ci.invite_id = n.entity_id
  LEFT JOIN users u ON n.actor_id = u.id
  LEFT JOIN circles c ON ci.circle_id = c.circle_id
  WHERE n.recipient_id = $1
  AND n.entity_type = 'circle_invite'
  ORDER BY n.created_at DESC
  `,
  [userId]
);

  res.json(result.rows);
});

/**
 * accept invite to a circle
 */
app.post("/invites/:inviteId/accept", async (req, res) => {
  const { inviteId } = req.params;
  const sessionId = req.headers["session-id"];

  if (!sessionId) return res.status(401).json({ error: "Not authenticated" });

  const session = await pool.query(
    "SELECT user_id FROM sessions WHERE session_id = $1",
    [sessionId]
  );

  if (!session.rows.length)
    return res.status(401).json({ error: "Invalid session" });

  const userId = session.rows[0].user_id;

  const invite = await pool.query(
    `
    SELECT * FROM circle_invites
    WHERE invite_id = $1
    AND invitee_id = $2
    AND status = 'pending'
    `,
    [inviteId, userId]
  );

  if (!invite.rows.length)
    return res.status(400).json({ error: "Invite not found" });

  const circleId = invite.rows[0].circle_id;

  // if accepted invite -> mark invite accepted
  await pool.query(
    `
    UPDATE circle_invites
    SET status = 'accepted'
    WHERE invite_id = $1
    `,
    [inviteId]
  );

  // if accepted invite -> add to members
  await pool.query(
    `
    INSERT INTO circle_members (circle_id, user_id, status, joined_at)
    VALUES ($1, $2, 'accepted', NOW())`,
    [circleId, userId]
  );

  // if accepted invite -> notification has been read
  await pool.query(
    `
    UPDATE notifications
    SET is_read = true
    WHERE recipient_id = $1
    AND entity_id = $2
    AND entity_type = 'circle_invite'
    `,
    [userId, inviteId]
  );

  res.json({ success: true });
});

/**
 * decline invite to a circle
 */
app.post("/invites/:inviteId/decline", async (req, res) => {
  const { inviteId } = req.params;
  const sessionId = req.headers["session-id"];

  if (!sessionId)
    return res.status(401).json({ error: "Not authenticated" });

  const session = await pool.query(
    "SELECT user_id FROM sessions WHERE session_id = $1",
    [sessionId]
  );

  if (!session.rows.length)
    return res.status(401).json({ error: "Invalid session" });

  const currentUserId = session.rows[0].user_id;

  // 1️⃣ Delete the invite
  await pool.query(
    `
    DELETE FROM circle_invites
    WHERE invite_id = $1
    AND invitee_id = $2
    `,
    [inviteId, currentUserId]
  );

  // 2️⃣ Delete the notification that references this invite
  await pool.query(
    `
    DELETE FROM notifications
    WHERE recipient_id = $1
    AND entity_id = $2
    AND entity_type = 'circle_invite'
    `,
    [currentUserId, inviteId]
  );

  res.json({ success: true });
});

/**
 * LEAVE CIRCLE
 */
app.delete("/circles/:circleId/leave", async (req, res) => {
  const client = await pool.connect();

  try {
    const sessionId = req.headers["session-id"] as string;
    if (!sessionId) {
      return res.status(401).json({ error: "Missing session" });
    }

    const { circleId } = req.params;

    await client.query("BEGIN");

    // 1️⃣ Get user from session
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

    const userId = userResult.rows[0].id;

    // 2️⃣ Remove membership
    await client.query(
      `
      DELETE FROM circle_members
      WHERE circle_id = $1
      AND user_id = $2
      `,
      [circleId, userId]
    );

    // 3️⃣ Check if any members remain
    const remaining = await client.query(
      `
      SELECT COUNT(*) 
      FROM circle_members
      WHERE circle_id = $1
      `,
      [circleId]
    );

    const memberCount = parseInt(remaining.rows[0].count, 10);

    // 4️⃣ If no members → delete circle
    if (memberCount === 0) {
      await client.query(
        `
        DELETE FROM circles
        WHERE circle_id = $1
        `,
        [circleId]
      );
    }

    await client.query("COMMIT");

    res.json({ success: true });

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Leave circle error:", err);
    res.status(500).json({ error: "Server error" });
  } finally {
    client.release();
  }
});

app.get("/homefeed", async (req, res) => {
  try {
    const sessionId = req.header("x-session-id");
    if (!sessionId)
      return res.status(401).json({ error: "Missing session" });

    const userId = await getUserIdFromSession(sessionId);
    if (!userId)
      return res.status(401).json({ error: "Invalid session" });

    const result = await pool.query(
      `
      SELECT 
        b.id,
        b.title,
        b.description,
        b.created_at,
        b.stake_amount,
        b.status,
        c.icon AS icon,

        creator.username AS creator_username,

        bt.target_type,

        CASE 
          WHEN bt.target_type = 'circle' THEN c.name
          WHEN bt.target_type = 'user' THEN target_user.username
        END AS target_name,

        json_agg(
          DISTINCT jsonb_build_object(
            'id', bo.id,
            'label', bo.label,
            'text', bo.option_text
          )
        ) FILTER (WHERE bo.id IS NOT NULL) AS options

      FROM bets b

      JOIN bet_targets bt
        ON bt.bet_id = b.id

      LEFT JOIN users creator
        ON creator.id = b.creator_user_id

      LEFT JOIN users target_user
        ON bt.target_type = 'user'
        AND target_user.id = bt.target_id

      LEFT JOIN circles c
        ON bt.target_type = 'circle'
        AND c.circle_id = bt.target_id

      LEFT JOIN bet_options bo
        ON bo.bet_id = b.id

      LEFT JOIN circle_members cm
        ON bt.target_type = 'circle'
        AND cm.circle_id = bt.target_id
        AND cm.user_id = $1
        AND cm.status = 'accepted'

      WHERE
        (
          bt.target_type = 'user'
          AND bt.target_id = $1
        )
        OR
        (
          bt.target_type = 'circle'
          AND cm.user_id IS NOT NULL
        )

      GROUP BY 
        b.id,
        creator.username,
        bt.target_type,
        c.name,
        c.icon,
        target_user.username

      ORDER BY b.created_at DESC
      `,
      [userId]
    );

    res.json(result.rows);

  } catch (err) {
    console.error("HOMEFEED ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});


const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

app.post("/bets/:betId/accept", async (req, res) => {
  const { betId } = req.params;
  const { selectedOptionId } = req.body;

  const sessionId = req.header("x-session-id");
  if (!sessionId) return res.status(401).json({ error: "Missing session" });

  const userId = await getUserIdFromSession(sessionId);
  if (!userId) return res.status(401).json({ error: "Invalid session" });

  try {
    await pool.query(
      `
      INSERT INTO bet_responses (bet_id, user_id, status, selected_option_id)
      VALUES ($1, $2, 'accepted', $3)
      ON CONFLICT (bet_id, user_id)
      DO UPDATE SET
        status = 'accepted',
        selected_option_id = EXCLUDED.selected_option_id,
        responded_at = now()
      `,
      [betId, userId, selectedOptionId]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("ACCEPT ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/bets/:betId/decline", async (req, res) => {
  const { betId } = req.params;

  const sessionId = req.header("x-session-id");
  if (!sessionId) return res.status(401).json({ error: "Missing session" });

  const userId = await getUserIdFromSession(sessionId);
  if (!userId) return res.status(401).json({ error: "Invalid session" });

  try {
    await pool.query(
      `
      INSERT INTO bet_responses (bet_id, user_id, status)
      VALUES ($1, $2, 'declined')
      ON CONFLICT (bet_id, user_id)
      DO UPDATE SET
        status = 'declined',
        responded_at = now()
      `,
      [betId, userId]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("DECLINE ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});