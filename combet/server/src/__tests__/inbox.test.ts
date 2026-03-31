// src/__tests__/inbox.test.ts
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

import { inboxRouter } from "../routes/inbox";

const app = express();
app.use(express.json());
app.use("/inbox", inboxRouter);

beforeEach(() => {
  jest.clearAllMocks();
  mockConnect.mockResolvedValue(mockClient);
});

// ─── Accept Circle Invite ─────────────────────────────────────────────────────
describe("POST /inbox/invites/:inviteId/accept", () => {

  it("accepts a circle invite and adds user to circle", async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [{ circle_id: "circle-abc", invitee_id: "user-123" }] })
      .mockResolvedValueOnce(undefined)    // BEGIN
      .mockResolvedValueOnce({ rows: [] }) // UPDATE invite
      .mockResolvedValueOnce({ rows: [] }) // INSERT circle_members
      .mockResolvedValueOnce({ rows: [] }) // DELETE join requests
      .mockResolvedValueOnce({ rows: [] }) // UPDATE notification
      .mockResolvedValueOnce(undefined);   // COMMIT

    const res = await request(app).post("/inbox/invites/invite-abc/accept");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("returns 400 if invite not found", async () => {
    mockClient.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).post("/inbox/invites/invite-xyz/accept");

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invite not found");
  });
});

// ─── Decline Circle Invite ────────────────────────────────────────────────────
describe("POST /inbox/invites/:inviteId/decline", () => {

  it("declines and removes the invite", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] }) // DELETE invite
      .mockResolvedValueOnce({ rows: [] }); // DELETE notification

    const res = await request(app).post("/inbox/invites/invite-abc/decline");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ─── Accept Follow Request ────────────────────────────────────────────────────
describe("POST /inbox/follow-requests/:requestId/accept", () => {

  it("accepts a follow request and creates the follow", async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [{ requester_id: "user-456", requestee_id: "user-123" }] })
      .mockResolvedValueOnce(undefined)    // BEGIN
      .mockResolvedValueOnce({ rows: [] }) // UPDATE status
      .mockResolvedValueOnce({ rows: [] }) // INSERT follows
      .mockResolvedValueOnce({ rows: [] }) // UPDATE notification
      .mockResolvedValueOnce(undefined);   // COMMIT

    const res = await request(app).post("/inbox/follow-requests/req-abc/accept");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("returns 400 if follow request not found", async () => {
    mockClient.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).post("/inbox/follow-requests/req-xyz/accept");

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Follow request not found");
  });
});

// ─── Decline Follow Request ───────────────────────────────────────────────────
describe("POST /inbox/follow-requests/:requestId/decline", () => {

  it("declines a follow request", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] }) // UPDATE status
      .mockResolvedValueOnce({ rows: [] }); // DELETE notification

    const res = await request(app).post("/inbox/follow-requests/req-abc/decline");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ─── Accept Circle Join Request ───────────────────────────────────────────────
describe("POST /inbox/join-requests/:requestId/accept", () => {

  it("accepts a join request and adds user to circle", async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [{ circle_id: "circle-abc", user_id: "user-456" }] }) // SELECT request
      .mockResolvedValueOnce({ rows: [{ "?column?": 1 }] }) // SELECT member check
      .mockResolvedValueOnce(undefined)    // BEGIN
      .mockResolvedValueOnce({ rows: [] }) // DELETE notifications
      .mockResolvedValueOnce({ rows: [] }) // DELETE invites
      .mockResolvedValueOnce({ rows: [] }) // INSERT circle_members
      .mockResolvedValueOnce({ rows: [] }) // UPDATE join request
      .mockResolvedValueOnce({ rows: [] }) // UPDATE notification read
      .mockResolvedValueOnce(undefined);   // COMMIT

    const res = await request(app).post("/inbox/join-requests/req-abc/accept");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("returns 403 if acceptor is not a circle member", async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [{ circle_id: "circle-abc", user_id: "user-456" }] })
      .mockResolvedValueOnce({ rows: [] }); // not a member

    const res = await request(app).post("/inbox/join-requests/req-abc/accept");

    expect(res.status).toBe(403);
    expect(res.body.error).toBe("Not a circle member");
  });

  it("returns 400 if join request not found", async () => {
    mockClient.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).post("/inbox/join-requests/req-xyz/accept");

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Request not found");
  });
});

// ─── Decline Circle Join Request ──────────────────────────────────────────────
describe("POST /inbox/join-requests/:requestId/decline", () => {

  it("declines a join request", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ circle_id: "circle-abc" }] }) // SELECT request
      .mockResolvedValueOnce({ rows: [{ "?column?": 1 }] })           // SELECT member
      .mockResolvedValueOnce({ rows: [] })                             // DELETE request
      .mockResolvedValueOnce({ rows: [] });                            // DELETE notification

    const res = await request(app).post("/inbox/join-requests/req-abc/decline");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("returns 403 if decliner is not a circle member", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ circle_id: "circle-abc" }] })
      .mockResolvedValueOnce({ rows: [] }); // not a member

    const res = await request(app).post("/inbox/join-requests/req-abc/decline");

    expect(res.status).toBe(403);
  });
});