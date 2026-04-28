export async function sendPushNotification(
  pushToken: string,
  title: string,
  body: string,
  data?: object
) {
  if (!pushToken) return;
  try {
    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: pushToken, title, body, data, sound: "default" }),
    });
  } catch (err) {
    console.error("Push notification error:", err);
  }
}