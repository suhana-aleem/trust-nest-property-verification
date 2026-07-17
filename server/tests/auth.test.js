const request = require("supertest");
const { app, loginUser } = require("./helpers");
const { USER_ROLES } = require("../src/utils/constants");

describe("Authentication API", () => {
  test("registers a public seller account", async () => {
    const response = await request(app).post("/api/auth/register").send({
      name: "Seller One",
      email: "seller@example.com",
      password: "Password1",
      role: USER_ROLES.SELLER
    });

    expect(response.statusCode).toBe(201);
    expect(response.body.token).toBeTruthy();
    expect(response.body.refreshToken).toBeTruthy();
    expect(response.body.user.role).toBe(USER_ROLES.SELLER);
  });

  test("rejects invite-only roles on public registration", async () => {
    const response = await request(app).post("/api/auth/register").send({
      name: "Registrar One",
      email: "registrar@example.com",
      password: "Password1",
      role: USER_ROLES.REGISTRAR
    });

    expect(response.statusCode).toBe(400);
  });

  test("prevents a public account from using the admin login route", async () => {
    await request(app).post("/api/auth/register").send({
      name: "Buyer One",
      email: "buyer@example.com",
      password: "Password1",
      role: USER_ROLES.BUYER
    });

    const response = await request(app).post("/api/auth/admin/login").send({
      email: "buyer@example.com",
      password: "Password1"
    });

    expect(response.statusCode).toBe(403);
    expect(response.body.message).toMatch(/admin panel/i);
  });

  test("allows system admin login and invite generation", async () => {
    const adminLogin = await request(app).post("/api/auth/admin/login").send({
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD
    });

    expect(adminLogin.statusCode).toBe(200);
    expect(adminLogin.body.user.role).toBe(USER_ROLES.ADMIN);

    const createInvite = await request(app)
      .post("/api/auth/admin/invites")
      .set("Authorization", `Bearer ${adminLogin.body.token}`)
      .send({ role: USER_ROLES.REGISTRAR });

    expect(createInvite.statusCode).toBe(201);
    expect(createInvite.body.invite.code).toMatch(/^INV-/);
    expect(createInvite.body.invite.role).toBe(USER_ROLES.REGISTRAR);
  });

  test("rotates refresh tokens and supports logout", async () => {
    const registered = await request(app).post("/api/auth/register").send({
      name: "Seller Two",
      email: "seller2@example.com",
      password: "Password1",
      role: USER_ROLES.SELLER
    });

    const refresh = await request(app).post("/api/auth/refresh").send({
      refreshToken: registered.body.refreshToken
    });

    expect(refresh.statusCode).toBe(200);
    expect(refresh.body.token).toBeTruthy();
    expect(refresh.body.refreshToken).toBeTruthy();
    expect(refresh.body.refreshToken).not.toBe(registered.body.refreshToken);

    const logout = await request(app).post("/api/auth/logout").send({
      refreshToken: refresh.body.refreshToken
    });

    expect(logout.statusCode).toBe(200);

    const refreshAfterLogout = await request(app).post("/api/auth/refresh").send({
      refreshToken: refresh.body.refreshToken
    });

    expect(refreshAfterLogout.statusCode).toBe(401);
  });
});
