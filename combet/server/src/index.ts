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

const app = express();

app.use(cors());
app.use((req, _res, next) => {
  console.log("ROUTE HIT:", req.method, req.url);
  next();
});
app.use(express.json());

app.use("/auth",     authRouter);
app.use("/circles",  circlesRouter);
app.use("/bets",     betsRouter);
app.use("/users",    usersRouter);
app.use("/inbox",    inboxRouter);
app.use("/homefeed", homefeedRouter);

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});