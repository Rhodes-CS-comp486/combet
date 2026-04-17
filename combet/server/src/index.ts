import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { startCronJobs } from "./cron";
import { authRouter }      from "./routes/auth";
import { circlesRouter }   from "./routes/circles";
import { betsRouter }      from "./routes/bets";
import { usersRouter }     from "./routes/users";
import { inboxRouter }     from "./routes/inbox";
import { homefeedRouter }  from "./routes/homefeed";
import { leaderboardRouter } from "./routes/leaderboard";
import { adminRouter } from "./routes/admin";
import { spinRouter } from "./routes/spin";
import { messagesRouter } from "./routes/messages";
import path = require("node:path");




dotenv.config();


const app = express();

app.use(cors());
app.use((req, _res, next) => {
  console.log("ROUTE HIT:", req.method, req.url);
  next();
});
app.use(express.json());

app.use("/api/auth",     authRouter);
app.use("/api/circles",  circlesRouter);
app.use("/api/bets",     betsRouter);
app.use("/api/users",    usersRouter);
app.use("/api/inbox",    inboxRouter);
app.use("/api/homefeed", homefeedRouter);
app.use("/api/leaderboard", leaderboardRouter);
app.use("/api/admin", adminRouter);
app.use("/api/spin", spinRouter);
app.use("/api/messages", messagesRouter);
app.get("/privacy", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "privacy.html"));
});


startCronJobs();

const PORT = process.env.PORT ? Number(process.env.PORT) : 3001; // changed for port 3002
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});