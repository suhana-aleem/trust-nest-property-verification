const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const InviteCode = require("../models/InviteCode");
const asyncHandler = require("../utils/asyncHandler");
const { USER_ROLES } = require("../utils/constants");
const { env } = require("../config/env");
const {
  buildAuthPayload,
  rotateRefreshToken,
  revokeRefreshToken
} = require("../services/tokenService");

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@system.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

const serializeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  isBlocked: Boolean(user.isBlocked),
  blockReason: user.blockReason || ""
});

const issueAuthResponse = async ({ user, req, res, statusCode = 200 }) => {
  const tokens = await buildAuthPayload({
    user,
    ipAddress: req.ip,
    userAgent: req.get("user-agent") || ""
  });

  return res.status(statusCode).json({
    user: serializeUser(user),
    token: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    refreshTokenExpiresAt: tokens.refreshTokenExpiresAt
  });
};

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
  if (user.isBlocked) {
    return res.status(403).json({ message: "This account is blocked" });
  }
  return issueAuthResponse({ user, req, res, statusCode: 201 });
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

  return issueAuthResponse({ user, req, res, statusCode: 201 });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select("+password");

  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ message: "Invalid credentials" });
  }
  if (user.isBlocked) {
    return res.status(403).json({ message: "This account has been blocked by an administrator" });
  }

  if (![USER_ROLES.SELLER, USER_ROLES.BUYER].includes(user.role)) {
    return res.status(403).json({ message: "Use admin login for this account" });
  }

  return issueAuthResponse({ user, req, res });
});

const adminLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    const adminUser = await ensureAdminUser();

    return issueAuthResponse({ user: adminUser, req, res });
  }

  const user = await User.findOne({ email }).select("+password");
  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ message: "Invalid admin credentials" });
  }
  if (user.isBlocked) {
    return res.status(403).json({ message: "This account has been blocked by an administrator" });
  }
  if (![USER_ROLES.ADMIN, USER_ROLES.REGISTRAR].includes(user.role)) {
    return res.status(403).json({ message: "This account is not allowed in admin panel" });
  }

  return issueAuthResponse({ user, req, res });
});

const me = asyncHandler(async (req, res) => {
  res.json({ user: req.user });
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ message: "refreshToken is required" });
  }

  const rotated = await rotateRefreshToken({
    refreshToken,
    ipAddress: req.ip,
    userAgent: req.get("user-agent") || ""
  });

  if (!rotated) {
    return res.status(401).json({ message: "Invalid or expired refresh token" });
  }

  res.json({
    user: serializeUser(rotated.user),
    token: rotated.accessToken,
    refreshToken: rotated.refreshToken,
    refreshTokenExpiresAt: rotated.refreshTokenExpiresAt
  });
});

const logout = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (refreshToken) {
    await revokeRefreshToken(refreshToken);
  }

  res.json({ message: "Logged out successfully" });
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
  const users = await User.find()
    .select("-password")
    .populate("blockedBy", "name email role")
    .sort({ createdAt: -1 });
  res.json({ users });
});

const blockUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }
  if (user.role === USER_ROLES.ADMIN) {
    return res.status(400).json({ message: "Admin account cannot be blocked" });
  }

  user.isBlocked = true;
  user.blockedAt = new Date();
  user.blockedBy = req.user._id;
  user.blockReason = req.body.reason?.trim() || "Blocked by administrator";
  await user.save();

  const userData = user.toObject();
  delete userData.password;
  res.json({ message: "User blocked successfully", user: userData });
});

const unblockUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  user.isBlocked = false;
  user.blockedAt = null;
  user.blockedBy = null;
  user.blockReason = "";
  await user.save();

  const userData = user.toObject();
  delete userData.password;
  res.json({ message: "User unblocked successfully", user: userData });
});

module.exports = {
  register,
  inviteRegister,
  login,
  adminLogin,
  me,
  refreshAccessToken,
  logout,
  generateInviteCode,
  listInviteCodes,
  listUsers,
  blockUser,
  unblockUser
};
