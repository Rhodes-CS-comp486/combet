// src/__tests__/bets.test.ts
import request from "supertest";
import express from "express";

const mockQuery   = jest.fn();
const mockConnect = jest.fn();
const mockClient  = { query: jest.fn(), release: jest.fn() };

jest.mock("../db", () => ({
  pool: {
    query:   mockQuery,
    connect: mockConnect,
  },
}));

jest.mock("../middleware/auth", () => ({
  requireAuth: (req: any, _res: any, next: any) => {
    req.userId = "user-123";
    next();
  },
}));

import { betsRouter } from "../routes/bets";

const app = express();
app.use(express.json());
app.use("/bets", betsRouter);

beforeEach(() => {
  jest.clearAllMocks();
  mockConnect.mockResolvedValue(mockClient);
});

// ─── Accept Bet ───────────────────────────────────────────────────────────────
describe("POST /bets/:betId/accept", () => {

  it("accepts a bet and deducts coins", async () => {
    mockClient.query
      .mockResolvedValueOnce(undefined)                                              // BEGIN
      .mockResolvedValueOnce({ rows: [{ stake_amount: 10, status: "PENDING" }] })   // SELECT bet
      .mockResolvedValueOnce({ rows: [{ coins: 100 }] })                            // SELECT coins
      .mockResolvedValueOnce({ rows: [] })                                           // UPDATE coins
      .mockResolvedValueOnce({ rows: [] })                                           // INSERT response
      .mockResolvedValueOnce(undefined);                                             // COMMIT
    mockQuery.mockResolvedValueOnce({ rows: [{ coins: 90 }] });                     // final SELECT coins

    const res = await request(app)
      .post("/bets/bet-abc/accept")
      .send({ selectedOptionId: "opt-1" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.coins).toBe(90);
  });

  it("returns 400 if bet is not PENDING", async () => {
    mockClient.query
      .mockResolvedValueOnce(undefined)                                             // BEGIN
      .mockResolvedValueOnce({ rows: [{ stake_amount: 10, status: "CLOSED" }] })   // SELECT bet
      .mockResolvedValueOnce(undefined);                                            // ROLLBACK

    const res = await request(app)
      .post("/bets/bet-abc/accept")
      .send({ selectedOptionId: "opt-1" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Bet is no longer open");
  });

  it("returns 400 if user has insufficient coins", async () => {
    mockClient.query
      .mockResolvedValueOnce(undefined)                                              // BEGIN
      .mockResolvedValueOnce({ rows: [{ stake_amount: 50, status: "PENDING" }] })   // SELECT bet
      .mockResolvedValueOnce({ rows: [{ coins: 10 }] })                             // SELECT coins (not enough)
      .mockResolvedValueOnce(undefined);                                             // ROLLBACK

    const res = await request(app)
      .post("/bets/bet-abc/accept")
      .send({ selectedOptionId: "opt-1" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Not enough coins");
    expect(res.body.coins).toBe(10);
  });

  it("returns 404 if bet does not exist", async () => {
    mockClient.query
      .mockResolvedValueOnce(undefined)    // BEGIN
      .mockResolvedValueOnce({ rows: [] }) // SELECT bet — not found
      .mockResolvedValueOnce(undefined);   // ROLLBACK

    const res = await request(app)
      .post("/bets/bet-xyz/accept")
      .send({ selectedOptionId: "opt-1" });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Bet not found");
  });
});

// ─── Settle Bet ───────────────────────────────────────────────────────────────
describe("POST /bets/:betId/settle", () => {

  it("settles a bet and pays out winners", async () => {
    mockClient.query
      .mockResolvedValueOnce(undefined) // BEGIN
      .mockResolvedValueOnce({ rows: [{ creator_user_id: "user-123", status: "CLOSED", stake_amount: 10, custom_stake: null }] })
      .mockResolvedValueOnce({ rows: [
        { user_id: "user-123", selected_option_id: "opt-1" },
        { user_id: "user-456", selected_option_id: "opt-1" },
        { user_id: "user-789", selected_option_id: "opt-2" },
      ]})
      .mockResolvedValueOnce({ rows: [] }) // UPDATE coins winner 1
      .mockResolvedValueOnce({ rows: [] }) // UPDATE coins winner 2
      .mockResolvedValueOnce({ rows: [] }) // UPDATE bets SETTLED
      .mockResolvedValueOnce(undefined);   // COMMIT

    const res = await request(app)
      .post("/bets/bet-abc/settle")
      .send({ winningOptionId: "opt-1" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("returns 403 if non-creator tries to settle", async () => {
    mockClient.query
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ rows: [{ creator_user_id: "user-999", status: "CLOSED", stake_amount: 10, custom_stake: null }] })
      .mockResolvedValueOnce(undefined); // ROLLBACK

    const res = await request(app)
      .post("/bets/bet-abc/settle")
      .send({ winningOptionId: "opt-1" });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe("Only the creator can settle this bet");
  });

  it("returns 404 if bet does not exist", async () => {
    mockClient.query
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce(undefined);

    const res = await request(app)
      .post("/bets/bet-xyz/settle")
      .send({ winningOptionId: "opt-1" });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Bet not found");
  });
});

// ─── Close Bet ────────────────────────────────────────────────────────────────
describe("POST /bets/:betId/close", () => {

  it("closes an open bet", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ creator_user_id: "user-123", status: "PENDING" }] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(app).post("/bets/bet-abc/close");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("returns 403 if non-creator tries to close", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ creator_user_id: "user-999", status: "PENDING" }] });

    const res = await request(app).post("/bets/bet-abc/close");

    expect(res.status).toBe(403);
  });

  it("returns 400 if bet is already closed", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ creator_user_id: "user-123", status: "CLOSED" }] });

    const res = await request(app).post("/bets/bet-abc/close");

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Bet is not open");
  });
});

// ─── Decline Bet ──────────────────────────────────────────────────────────────
describe("POST /bets/:betId/decline", () => {

  it("declines a bet", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).post("/bets/bet-abc/decline");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});