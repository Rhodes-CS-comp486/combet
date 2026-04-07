import express from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

import { authRouter }      from "./routes/auth";
import { circlesRouter }   from "./routes/circles";
import { betsRouter }      from "./routes/bets";
import { usersRouter }     from "./routes/users";
import { inboxRouter }     from "./routes/inbox";
import { homefeedRouter }  from "./routes/homefeed";
import { leaderboardRouter } from "./routes/leaderboard";


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


import { startCronJobs } from "./cron";
startCronJobs();

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});