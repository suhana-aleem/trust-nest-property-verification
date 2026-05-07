const request = require("supertest");
const User = require("../src/models/User");
const { USER_ROLES } = require("../src/utils/constants");

const app = require("../src/app");

const registerPublicUser = async ({
  name,
  email,
  password = "Password1",
  role = USER_ROLES.SELLER
}) =>
  request(app).post("/api/auth/register").send({
    name,
    email,
    password,
    role
  });

const createStaffUser = async ({
  name,
  email,
  password = "Password1",
  role = USER_ROLES.LEGAL_OFFICER
}) => {
  const user = await User.create({
    name,
    email,
    password,
    role
  });

  return user;
};

const loginUser = async ({ email, password = "Password1", admin = false }) =>
  request(app)
    .post(admin ? "/api/auth/admin/login" : "/api/auth/login")
    .send({ email, password });

const pdfFixture = () =>
  Buffer.from(
    "%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF",
    "utf-8"
  );

module.exports = {
  app,
  registerPublicUser,
  createStaffUser,
  loginUser,
  pdfFixture
};
