const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const InviteCode = require("../models/InviteCode");
const asyncHandler = require("../utils/asyncHandler");
const { USER_ROLES } = require("../utils/constants");
const { env } = require("../config/env");

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@system.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

const generateToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: env.jwtExpiresIn
  });

const serializeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role
});

const ensureAdminUser = async () => {
  if (env.isProduction && (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD)) {
    throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD must be configured in production");
  }

  let adminUser = await User.findOne({ email: ADMIN_EMAIL }).select("+password");

  if (!adminUser) {
    adminUser = await User.create({
      name: "System Admin",
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      role: USER_ROLES.ADMIN
    });
    adminUser = await User.findOne({ email: ADMIN_EMAIL }).select("+password");
  }

  return adminUser;
};

const register = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(409).json({ message: "Email already registered" });
  }

  const user = await User.create({ name, email, password, role });
  return res.status(201).json({
    user: serializeUser(user),
    token: generateToken(user._id)
  });
});

const inviteRegister = asyncHandler(async (req, res) => {
  const { name, email, password, inviteCode } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(409).json({ message: "Email already registered" });
  }

  const invite = await InviteCode.findOne({ code: inviteCode.trim() });
  if (!invite || invite.isUsed) {
    return res.status(400).json({ message: "Invalid or already used invite code" });
  }
  if (invite.expiresAt < new Date()) {
    return res.status(400).json({ message: "Invite code has expired" });
  }

  const user = await User.create({
    name,
    email,
    password,
    role: invite.role
  });

  invite.isUsed = true;
  invite.usedBy = user._id;
  await invite.save();

  return res.status(201).json({
    user: serializeUser(user),
    token: generateToken(user._id)
  });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select("+password");

  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  if (![USER_ROLES.SELLER, USER_ROLES.BUYER].includes(user.role)) {
    return res.status(403).json({ message: "Use admin login for this account" });
  }

  return res.status(200).json({
    user: serializeUser(user),
    token: generateToken(user._id)
  });
});

const adminLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    const adminUser = await ensureAdminUser();

    return res.status(200).json({
      user: serializeUser(adminUser),
      token: generateToken(adminUser._id)
    });
  }

  const user = await User.findOne({ email }).select("+password");
  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ message: "Invalid admin credentials" });
  }
  if (![USER_ROLES.ADMIN, USER_ROLES.LEGAL_OFFICER, USER_ROLES.REGISTRAR].includes(user.role)) {
    return res.status(403).json({ message: "This account is not allowed in admin panel" });
  }

  return res.status(200).json({
    user: serializeUser(user),
    token: generateToken(user._id)
  });
});

const me = asyncHandler(async (req, res) => {
  res.json({ user: req.user });
});

const generateInviteCode = asyncHandler(async (req, res) => {
  const code = `INV-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const invite = await InviteCode.create({
    code,
    role: req.body.role,
    createdBy: req.user._id,
    expiresAt
  });

  res.status(201).json({
    message: "Invite code generated",
    invite: {
      code: invite.code,
      role: invite.role,
      expiresAt: invite.expiresAt
    }
  });
});

const listInviteCodes = asyncHandler(async (req, res) => {
  const invites = await InviteCode.find()
    .populate("createdBy", "name email role")
    .populate("usedBy", "name email role")
    .sort({ createdAt: -1 });

  res.json({ invites });
});

const listUsers = asyncHandler(async (req, res) => {
  const users = await User.find().select("-password").sort({ createdAt: -1 });
  res.json({ users });
});

module.exports = {
  register,
  inviteRegister,
  login,
  adminLogin,
  me,
  generateInviteCode,
  listInviteCodes,
  listUsers
};
