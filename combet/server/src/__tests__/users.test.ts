// src/__tests__/users.test.ts
import request from "supertest";
import express from "express";

// ── Mock the DB before importing anything that uses it ────────────────────────
const mockQuery   = jest.fn();
const mockConnect = jest.fn();

jest.mock("../db", () => ({
  pool: {
    query:   mockQuery,
    connect: mockConnect,
  },
}));

// ── Mock auth middleware so routes don't return 401 ───────────────────────────
jest.mock("../middleware/auth", () => ({
  requireAuth: (req: any, _res: any, next: any) => {
    req.userId = "user-123";
    next();
  },
}));

import { usersRouter } from "../routes/users";

const app = express();
app.use(express.json());
app.use("/users", usersRouter);

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── Follow / Request to Follow ───────────────────────────────────────────────
describe("POST /users/follows", () => {

  it("follows a public user directly", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ is_private: false }] }) // SELECT is_private
      .mockResolvedValueOnce({ rows: [] });                      // INSERT follows

    const res = await request(app)
      .post("/users/follows")
      .send({ followingId: "user-456" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, status: "following" });
  });

  it("sends a follow request to a private user", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ is_private: true }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ request_id: "req-abc" }] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post("/users/follows")
      .send({ followingId: "user-456" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, status: "requested" });
  });

  it("returns 400 if follow request already sent", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ is_private: true }] })
      .mockResolvedValueOnce({ rows: [{ request_id: "req-existing" }] });

    const res = await request(app)
      .post("/users/follows")
      .send({ followingId: "user-456" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Follow request already sent");
  });

  it("returns 400 if trying to follow yourself", async () => {
    const res = await request(app)
      .post("/users/follows")
      .send({ followingId: "user-123" }); // same as mocked userId

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Cannot follow yourself");
  });

  it("returns 400 if followingId is missing", async () => {
    const res = await request(app)
      .post("/users/follows")
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("followingId required");
  });

  it("returns 404 if target user does not exist", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post("/users/follows")
      .send({ followingId: "user-999" });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("User not found");
  });
});

// ─── Get My Profile ───────────────────────────────────────────────────────────
describe("GET /users/me", () => {

  it("returns the user profile", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{
        id:              "user-123",
        username:        "tyler",
        email:           "tyler@test.com",
        first_name:      "Tyler",
        last_name:       "Smith",
        coins:           100,
        bio:             "test bio",
        avatar_color:    "#2563eb",
        avatar_icon:     "basketball",
        is_private:      false,
        created_at:      new Date().toISOString(),
        followers_count: 5,
        following_count: 3,
        total_bets:      10,
        wins:            4,
        losses:          6,
      }],
    });

    const res = await request(app).get("/users/me");

    expect(res.status).toBe(200);
    expect(res.body.username).toBe("tyler");
    expect(res.body.display_name).toBe("Tyler Smith");
    expect(res.body.wins).toBe(4);
    expect(res.body.losses).toBe(6);
    expect(res.body.is_private).toBe(false);
  });

  it("returns 404 if user not found", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get("/users/me");

    expect(res.status).toBe(404);
  });
});