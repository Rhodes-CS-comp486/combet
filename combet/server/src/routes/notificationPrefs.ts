import { Router } from "express";
import { pool } from "../db";
import { requireAuth, AuthRequest } from "../middleware/auth";

export const notificationPrefsRouter = Router();

// Ensure a prefs row exists for the user (called internally)
async function ensurePrefs(userId: string) {
  await pool.query(
    `INSERT INTO notification_preferences (user_id)
     VALUES ($1)
     ON CONFLICT (user_id) DO NOTHING`,
    [userId]
  );
}

// ─── Get Notification Preferences ────────────────────────────────────────────
notificationPrefsRouter.get("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    await ensurePrefs(req.userId!);
    const result = await pool.query(
      `SELECT
         notify_new_follower,
         notify_follow_request,
         notify_follow_accepted,
         notify_circle_invite,
         notify_circle_join_request,
         notify_bet_deadline,
         notify_messages
       FROM notification_preferences
       WHERE user_id = $1`,
      [req.userId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error("GET notification-preferences error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── Update Notification Preferences ─────────────────────────────────────────
notificationPrefsRouter.patch("/", requireAuth, async (req: AuthRequest, res) => {
  const allowed = [
    "notify_new_follower",
    "notify_follow_request",
    "notify_follow_accepted",
    "notify_circle_invite",
    "notify_circle_join_request",
    "notify_bet_deadline",
    "notify_messages",
  ] as const;

  const updates: Partial<Record<typeof allowed[number], boolean>> = {};
  for (const key of allowed) {
    if (typeof req.body[key] === "boolean") {
      updates[key] = req.body[key];
    }
  }

  if (Object.keys(updates).length === 0)
    return res.status(400).json({ error: "No valid fields provided" });

  try {
    await ensurePrefs(req.userId!);

    const setClauses = Object.keys(updates)
      .map((key, i) => `${key} = $${i + 2}`)
      .join(", ");
    const values = [req.userId, ...Object.values(updates)];

    await pool.query(
      `UPDATE notification_preferences SET ${setClauses} WHERE user_id = $1`,
      values
    );

    const result = await pool.query(
      `SELECT * FROM notification_preferences WHERE user_id = $1`,
      [req.userId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error("PATCH notification-preferences error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── Helper: check if a user wants a given notification type ─────────────────
// Call this before inserting any notification to respect user prefs.
export async function userWantsNotification(
  recipientId: string,
  prefKey: typeof PREF_KEYS[number]
): Promise<boolean> {
  try {
    await ensurePrefs(recipientId);
    const result = await pool.query(
      `SELECT ${prefKey} FROM notification_preferences WHERE user_id = $1`,
      [recipientId]
    );
    return result.rows[0]?.[prefKey] !== false;
  } catch {
    return true; // Default to sending if lookup fails
  }
}

export const PREF_KEYS = [
  "notify_new_follower",
  "notify_follow_request",
  "notify_follow_accepted",
  "notify_circle_invite",
  "notify_circle_join_request",
  "notify_bet_deadline",
  "notify_messages",
] as const;