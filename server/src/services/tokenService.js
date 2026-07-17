const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const RefreshToken = require("../models/RefreshToken");
const { env } = require("../config/env");

const hashToken = (value) => crypto.createHash("sha256").update(value).digest("hex");

const signAccessToken = (userId) =>
  jwt.sign({ id: userId, type: "access" }, process.env.JWT_SECRET, {
    expiresIn: env.jwtExpiresIn
  });

const buildAuthPayload = async ({ user, ipAddress = "", userAgent = "" }) => {
  const accessToken = signAccessToken(user._id);
  const refreshToken = crypto.randomBytes(48).toString("hex");
  const refreshTokenHash = hashToken(refreshToken);
  const expiresAt = new Date(Date.now() + env.refreshTokenTtlMs);

  await RefreshToken.create({
    user: user._id,
    tokenHash: refreshTokenHash,
    expiresAt,
    userAgent,
    ipAddress
  });

  return {
    accessToken,
    refreshToken,
    refreshTokenExpiresAt: expiresAt
  };
};

const rotateRefreshToken = async ({
  refreshToken,
  ipAddress = "",
  userAgent = ""
}) => {
  const tokenHash = hashToken(refreshToken);
  const storedToken = await RefreshToken.findOne({ tokenHash }).populate("user");

  if (!storedToken || storedToken.revokedAt || storedToken.expiresAt < new Date()) {
    return null;
  }
  if (storedToken.user?.isBlocked) {
    storedToken.revokedAt = new Date();
    await storedToken.save();
    return null;
  }

  const nextRefreshToken = crypto.randomBytes(48).toString("hex");
  const nextRefreshTokenHash = hashToken(nextRefreshToken);
  const nextExpiresAt = new Date(Date.now() + env.refreshTokenTtlMs);

  storedToken.revokedAt = new Date();
  storedToken.replacedByTokenHash = nextRefreshTokenHash;
  await storedToken.save();

  await RefreshToken.create({
    user: storedToken.user._id,
    tokenHash: nextRefreshTokenHash,
    expiresAt: nextExpiresAt,
    userAgent,
    ipAddress
  });

  return {
    user: storedToken.user,
    accessToken: signAccessToken(storedToken.user._id),
    refreshToken: nextRefreshToken,
    refreshTokenExpiresAt: nextExpiresAt
  };
};

const revokeRefreshToken = async (refreshToken) => {
  const tokenHash = hashToken(refreshToken);
  await RefreshToken.findOneAndUpdate(
    { tokenHash, revokedAt: null },
    { revokedAt: new Date() }
  );
};

module.exports = {
  signAccessToken,
  buildAuthPayload,
  rotateRefreshToken,
  revokeRefreshToken
};
