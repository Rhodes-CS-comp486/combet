// src/__tests__/circles.test.ts
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

import { circlesRouter } from "../routes/circles";

const app = express();
app.use(express.json());
app.use("/circles", circlesRouter);

beforeEach(() => {
  jest.clearAllMocks();
  mockConnect.mockResolvedValue(mockClient);
});

// ─── Create Circle ────────────────────────────────────────────────────────────
describe("POST /circles", () => {

  it("creates a circle and adds creator as member", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })                                    // name not taken
      .mockResolvedValueOnce({ rows: [{ circle_id: "circle-abc" }] })        // INSERT circle
      .mockResolvedValueOnce({ rows: [] });                                   // INSERT member

    const res = await request(app)
      .post("/circles")
      .send({ name: "The Boys", description: "Our group", icon: "people", icon_color: "#2563eb", is_private: false });

    expect(res.status).toBe(201);
    expect(res.body.circle_id).toBe("circle-abc");
  });

  it("returns 400 if name is too short (under 5 chars)", async () => {
    const res = await request(app)
      .post("/circles")
      .send({ name: "Hi" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Name must be 5-15 characters");
  });

  it("returns 400 if name is too long (over 15 chars)", async () => {
    const res = await request(app)
      .post("/circles")
      .send({ name: "ThisNameIsTooLongForACircle" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Name must be 5-15 characters");
  });

  it("returns 400 if description exceeds 100 characters", async () => {
    const res = await request(app)
      .post("/circles")
      .send({ name: "Valid", description: "x".repeat(101) });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Description max 100 characters");
  });

  it("returns 409 if circle name already exists", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ "?column?": 1 }] }); // name taken

    const res = await request(app)
      .post("/circles")
      .send({ name: "The Boys" });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe("A circle with that name already exists");
  });
});

// ─── Get My Circles ───────────────────────────────────────────────────────────
describe("GET /circles/my", () => {

  it("returns list of circles the user belongs to", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        { circle_id: "c1", name: "The Boys", icon: "people", icon_color: "#2563eb", is_private: false },
        { circle_id: "c2", name: "Work Crew", icon: "briefcase", icon_color: "#dc2626", is_private: true },
      ],
    });

    const res = await request(app).get("/circles/my");

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].name).toBe("The Boys");
    expect(res.body[1].name).toBe("Work Crew");
  });

  it("returns empty array if user has no circles", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get("/circles/my");

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(0);
  });
});

// ─── Get Circle Members ───────────────────────────────────────────────────────
describe("GET /circles/:id/members", () => {

  it("returns list of accepted members", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        { id: "user-1", username: "alice", avatar_color: "#2563eb", avatar_icon: "basketball" },
        { id: "user-2", username: "bob",   avatar_color: "#dc2626", avatar_icon: "flame"      },
      ],
    });

    const res = await request(app).get("/circles/circle-abc/members");

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].username).toBe("alice");
    expect(res.body[1].username).toBe("bob");
  });

  it("returns empty array if circle has no members", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get("/circles/circle-abc/members");

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(0);
  });
});

// ─── Invite Friend to Circle ──────────────────────────────────────────────────
describe("POST /circles/:circleId/invite", () => {

  it("invites a user to a circle", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })                                   // no existing invite
      .mockResolvedValueOnce({ rows: [{ invite_id: "inv-abc" }] })           // INSERT invite
      .mockResolvedValueOnce({ rows: [] });                                   // INSERT notification

    const res = await request(app)
      .post("/circles/circle-abc/invite")
      .send({ inviteeId: "user-456" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.inviteId).toBe("inv-abc");
  });

  it("returns 400 if user is already invited", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ "?column?": 1 }] }); // existing invite

    const res = await request(app)
      .post("/circles/circle-abc/invite")
      .send({ inviteeId: "user-456" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Already invited");
  });
});

// ─── Retract Invite ───────────────────────────────────────────────────────────
describe("DELETE /circles/:circleId/retract/:inviteeId", () => {

  it("retracts a pending invite", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ invite_id: "inv-abc" }] })  // SELECT invite
      .mockResolvedValueOnce({ rows: [] })                           // DELETE invite
      .mockResolvedValueOnce({ rows: [] });                          // DELETE notification

    const res = await request(app)
      .delete("/circles/circle-abc/retract/user-456");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("returns 403 if invite was not sent by current user", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] }); // invite not found for this inviter

    const res = await request(app)
      .delete("/circles/circle-abc/retract/user-456");

    expect(res.status).toBe(403);
    expect(res.body.error).toBe("Cannot retract this invite");
  });
});

// ─── Join Circle (public) ─────────────────────────────────────────────────────
describe("POST /circles/:circleId/join", () => {

  it("joins a public circle directly", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ is_private: false }] })  // SELECT circle
      .mockResolvedValueOnce({ rows: [] });                        // INSERT member

    const res = await request(app).post("/circles/circle-abc/join");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("returns 403 if circle is private", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ is_private: true }] });

    const res = await request(app).post("/circles/circle-abc/join");

    expect(res.status).toBe(403);
    expect(res.body.error).toBe("Circle is private");
  });

  it("returns 404 if circle does not exist", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).post("/circles/circle-xyz/join");

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Circle not found");
  });
});

// ─── Request to Join Private Circle ──────────────────────────────────────────
describe("POST /circles/:circleId/request-join", () => {

  it("sends a join request for a private circle", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })                                        // not already a member
      .mockResolvedValueOnce({ rows: [{ request_id: "req-abc" }] })              // INSERT request
      .mockResolvedValueOnce({ rows: [{ user_id: "user-456" }] })                // SELECT members to notify
      .mockResolvedValueOnce({ rows: [] });                                        // INSERT notification

    const res = await request(app).post("/circles/circle-abc/request-join");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("returns 400 if user is already a member", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ "?column?": 1 }] }); // already a member

    const res = await request(app).post("/circles/circle-abc/request-join");

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Already a member");
  });
});

// ─── Leave Circle ─────────────────────────────────────────────────────────────
describe("DELETE /circles/:circleId/leave", () => {

  it("leaves a circle", async () => {
    mockClient.query
      .mockResolvedValueOnce(undefined)               // BEGIN
      .mockResolvedValueOnce({ rows: [] })            // DELETE member
      .mockResolvedValueOnce({ rows: [{ count: "2" }] }) // COUNT remaining (circle survives)
      .mockResolvedValueOnce(undefined);              // COMMIT

    const res = await request(app).delete("/circles/circle-abc/leave");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("deletes the circle if last member leaves", async () => {
    mockClient.query
      .mockResolvedValueOnce(undefined)               // BEGIN
      .mockResolvedValueOnce({ rows: [] })            // DELETE member
      .mockResolvedValueOnce({ rows: [{ count: "0" }] }) // COUNT remaining (0 — delete circle)
      .mockResolvedValueOnce({ rows: [] })            // DELETE circle
      .mockResolvedValueOnce(undefined);              // COMMIT

    const res = await request(app).delete("/circles/circle-abc/leave");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ─── Search Friends to Add ────────────────────────────────────────────────────
describe("GET /circles/:circleId/search-friends", () => {

  it("returns friends with their circle membership status", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        { id: "user-1", username: "alice", avatar_color: "#2563eb", avatar_icon: "basketball", member_status: "accepted", invite_status: null, inviter_id: null },
        { id: "user-2", username: "bob",   avatar_color: "#dc2626", avatar_icon: "flame",      member_status: null,       invite_status: "pending", inviter_id: "user-123" },
        { id: "user-3", username: "carol", avatar_color: "#16a34a", avatar_icon: "leaf",       member_status: null,       invite_status: null, inviter_id: null },
      ],
    });

    const res = await request(app)
      .get("/circles/circle-abc/search-friends?q=a");

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(3);

    // alice is already in the circle
    expect(res.body[0].status).toBe("accepted");

    // bob has a pending invite sent by current user
    expect(res.body[1].status).toBe("pending");
    expect(res.body[1].invitedByMe).toBe(true);

    // carol has no relationship
    expect(res.body[2].status).toBeNull();
  });
});

// ─── Get Pending Join Requests ────────────────────────────────────────────────
describe("GET /circles/:circleId/requests", () => {

  it("returns pending join requests for circle members", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ "?column?": 1 }] })  // is a member check
      .mockResolvedValueOnce({
        rows: [
          { request_id: "req-1", created_at: new Date().toISOString(), user_id: "user-456", username: "dave", avatar_color: "#2563eb", avatar_icon: "star" },
        ],
      });

    const res = await request(app).get("/circles/circle-abc/requests");

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].username).toBe("dave");
  });

  it("returns 403 if user is not a circle member", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] }); // not a member

    const res = await request(app).get("/circles/circle-abc/requests");

    expect(res.status).toBe(403);
    expect(res.body.error).toBe("Not a member");
  });
});

// ─── Check Name Availability ──────────────────────────────────────────────────
describe("GET /circles/check-name", () => {

  it("returns taken: false for an available name", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get("/circles/check-name?name=NewCircle");

    expect(res.status).toBe(200);
    expect(res.body.taken).toBe(false);
  });

  it("returns taken: true for an existing name", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ "?column?": 1 }] });

    const res = await request(app).get("/circles/check-name?name=TheBoyz");

    expect(res.status).toBe(200);
    expect(res.body.taken).toBe(true);
  });

  it("returns 400 if name is missing", async () => {
    const res = await request(app).get("/circles/check-name");

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Name required");
  });
});