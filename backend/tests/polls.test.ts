/* Polls API - Supertest + Vitest */

// Test list of available endpoints:
// (1) GET /polls                      # list with metrics (auth required)
// (2) GET /polls/:id                  # detail with matrics and distribution (auth required)
// (3) POST /polls/:id/vote            # upsert vote (OPEN ok, CLOSED 403, bad rating 400)
// (4) POST /polls                     # create poll (admin only, 201 / 403 / 400)
// (5) POST /polls/:id/close           # close poll (200 once, 409 if already closed, 404)

/* Supertest */
import request from "supertest";

/* Vitest */
import { describe, it, expect, beforeAll } from "vitest";

/* App modules */
import { app } from "../src/test-app";

/* Supertest target */
// - Use the in-memory Express app for local tests (no ports required)
const BASE_URL = app;

/* Credentials */
const ADMIN_EMAIL =
  process.env.ADMIN_EMAIL || process.env.TEST_ADMIN_EMAIL || "admin@polls.local";
const ADMIN_PASSWORD =
  process.env.ADMIN_PASSWORD || process.env.TEST_ADMIN_PASSWORD || "Admin!123";

const USER_EMAIL =
  process.env.USER_EMAIL || process.env.TEST_USER_EMAIL || "user1@polls.local";
const USER_PASSWORD =
  process.env.USER_PASSWORD || process.env.TEST_USER_PASSWORD || "User1!123";

/* Types for response shapes */
type LoginResp = {
  token: string;
  user: { id: string; email: string; role: "user" | "admin" };
};

let adminToken = "";     // valid admin JWT for privileged endpoints
let userToken = "";      // valid user JWT for regular endpoints
let openPollId = "";     // a poll created in beforeAll (kept OPEN for voting tests)
let closedPollId = "";   // a poll created in beforeAll, then CLOSED for negative cases


/* Helpers */
const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));


/* Log into the API and return a valid JWT */
// Test will fail with not login success.
async function login(email: string, password: string): Promise<LoginResp> {
  const res = await request(BASE_URL).post(`/api/auth/login`).send({ email, password });
  expect(res.status, `Login failed for ${email}`).toBe(200);
  const body = res.body as LoginResp;
  expect(body?.token).toBeTruthy();
  expect(body?.user?.email).toBe(email);
  return body;
}


/* Create a new poll as admin */
// Return its id Asserts 201 + basic payload.
async function createPoll(title: string, description?: string): Promise<string> {
  const res = await request(BASE_URL)
    .post("/api/polls")
    .set(bearer(adminToken))
    .send({ title, description });

  expect(res.status).toBe(201);
  expect(res.headers).toHaveProperty("location");
  expect(res.body).toMatchObject({
    id: expect.any(String),
    title,
    status: "OPEN",
  });
  return res.body.id as string;
}


/** Close a poll by id as admin */
// Asserts 200 and CLOSED status.
async function closePoll(id: string) {
  const res = await request(BASE_URL)
    .post(`/api/polls/${id}/close`)
    .set(bearer(adminToken));

  expect(res.status).toBe(200);
  expect(res.body).toMatchObject({ id, status: "CLOSED" });
}


/* Global bootstrap */
// - Log in as admin + user
// - Create two polls (OPEN and CLOSED)
beforeAll(async () => {
  // admin login
  const adminLogin = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
  expect(adminLogin.user.role, `Expected admin role for ${ADMIN_EMAIL}, got ${adminLogin.user.role}`)
    .toBe("admin");
  adminToken = adminLogin.token;

  // user login
  const userLogin = await login(USER_EMAIL, USER_PASSWORD);
  expect(userLogin.user.role).toBe("user");
  userToken = userLogin.token;

  // provide test data
  openPollId = await createPoll(
    `OPEN Poll ${Date.now()}`,
    "This poll stays OPEN to test voting flow"
  );

  closedPollId = await createPoll(
    `CLOSED Poll ${Date.now()}`,
    "This poll will be CLOSED to test forbidden vote"
  );
  await closePoll(closedPollId);

  // pause (useful on slow DBs)
  await pause(100);
});


/* (1) GET /polls (list) */
describe("GET /polls - list", () => {
  it("returns list with metrics for an authenticated user", async () => {
    const res = await request(BASE_URL).get("/api/polls").set(bearer(userToken));

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("items");
    expect(Array.isArray(res.body.items)).toBe(true);

    // Spot-check shape of the first item (if any)
    const sample = res.body.items[0];
    if (sample) {
      expect(sample).toMatchObject({
        id: expect.any(String),
        title: expect.any(String),
        status: expect.stringMatching(/^(OPEN|CLOSED)$/),
        avg: expect.any(Number),
        count: expect.any(Number),
        userHasVoted: expect.any(Boolean),
      });
    }
  });

  it("rejects when auth header is missing", async () => {
    const res = await request(BASE_URL).get("/api/polls");
    expect([401, 403]).toContain(res.status);
  });
});


/* (2) GET /polls/:id (detail) */
describe("GET /polls/:id - detail", () => {
  it("returns detail + 5 rating distribution for an existing poll", async () => {
    const res = await request(BASE_URL)
      .get(`/api/polls/${openPollId}`)
      .set(bearer(userToken));

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: openPollId,
      title: expect.any(String),
      status: expect.stringMatching(/^(OPEN|CLOSED)$/),
      avg: expect.any(Number),
      count: expect.any(Number),
      distribution: expect.any(Array),
    });

    const dist = res.body.distribution as Array<{ rating: number; count: number }>;
    expect(dist.length).toBe(5);
    dist.forEach((b, i) => {
      expect(b.rating).toBe(i + 1);
      expect(typeof b.count).toBe("number");
    });
  });

  it("returns 404 for a non-existing poll id", async () => {
    const res = await request(BASE_URL)
      .get(`/api/polls/p_nonexistent_${Date.now()}`)
      .set(bearer(userToken));

    expect(res.status).toBe(404);
    expect(res.body?.error?.code).toBe("NOT_FOUND");
  });
});


/* (3) POST /polls/:id/vote (upsert) */
describe("POST /polls/:id/vote - upsert vote", () => {
  it("200 when voting on an OPEN poll", async () => {
    const res = await request(BASE_URL)
      .post(`/api/polls/${openPollId}/vote`)
      .set(bearer(userToken))
      .send({ rating: 4 });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      pollId: openPollId,
      userId: expect.any(String),
      rating: 4,
    });

    const d = await request(BASE_URL)
      .get(`/api/polls/${openPollId}`)
      .set(bearer(userToken));

    expect(d.status).toBe(200);
    expect(d.body.count).toBeGreaterThanOrEqual(1);
  });

  it("400 when rating is out of range (e.g., 6)", async () => {
    const res = await request(BASE_URL)
      .post(`/api/polls/${openPollId}/vote`)
      .set(bearer(userToken))
      .send({ rating: 6 });

    expect(res.status).toBe(400);
    // Contract allows BAD_REQUEST or VALIDATION_ERROR as equivalent meanings
    expect(["BAD_REQUEST", "VALIDATION_ERROR"]).toContain(res.body?.error?.code);
  });

  it("403 when voting on a CLOSED poll", async () => {
    const res = await request(BASE_URL)
      .post(`/api/polls/${closedPollId}/vote`)
      .set(bearer(userToken))
      .send({ rating: 3 });

    expect(res.status).toBe(403);
    expect(res.body?.error?.code).toBe("FORBIDDEN");
  });
});


/* (4) POST /polls (admin only) */
describe("POST /polls - create", () => {
  it("201 for admin create; 403 for non-admin", async () => {
    // Admin can create
    const ok = await request(BASE_URL)
      .post("/api/polls")
      .set(bearer(adminToken))
      .send({ title: `Admin-created ${Date.now()}`, description: "desc" });

    expect(ok.status).toBe(201);
    expect(ok.body).toMatchObject({ id: expect.any(String), status: "OPEN" });

    // Non-admin cannot create
    const ko = await request(BASE_URL)
      .post("/api/polls")
      .set(bearer(userToken))
      .send({ title: "Should fail" });

    expect(ko.status).toBe(403);
    expect(ko.body?.error?.code).toBe("FORBIDDEN");
  });

  it("400 when missing required title", async () => {
    const res = await request(BASE_URL)
      .post("/api/polls")
      .set(bearer(adminToken))
      .send({ description: "missing title" });

    expect(res.status).toBe(400);
    expect(["BAD_REQUEST", "VALIDATION_ERROR"]).toContain(res.body?.error?.code);
  });
});


/* (5) POST /polls/:id/close (admin only) */
describe("POST /polls/:id/close - close", () => {
  it("200 on first close, 409 if closing again", async () => {
    // Create a fresh OPEN poll to close
    const id = await createPoll(`ToClose ${Date.now()}`);

    // First close → OK
    const first = await request(BASE_URL)
      .post(`/api/polls/${id}/close`)
      .set(bearer(adminToken));

    expect(first.status).toBe(200);
    expect(first.body).toMatchObject({ id, status: "CLOSED" });

    // Second close → conflict
    const second = await request(BASE_URL)
      .post(`/api/polls/${id}/close`)
      .set(bearer(adminToken));

    expect(second.status).toBe(409);
    expect(second.body?.error?.code).toBe("CONFLICT");
  });

  it("404 when closing a non-existing poll", async () => {
    const res = await request(BASE_URL)
      .post(`/api/polls/p_nonexistent_${Date.now()}/close`)
      .set(bearer(adminToken));

    expect(res.status).toBe(404);
    expect(res.body?.error?.code).toBe("NOT_FOUND");
  });
});