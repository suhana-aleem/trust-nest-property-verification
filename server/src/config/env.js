const parseOrigins = (value) =>
  String(value || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

const ensure = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const validateEnv = () => {
  ensure(process.env.MONGODB_URI, "MONGODB_URI is required");
  ensure(process.env.JWT_SECRET, "JWT_SECRET is required");

  if (process.env.NODE_ENV === "production") {
    ensure(
      process.env.JWT_SECRET.length >= 32,
      "JWT_SECRET must be at least 32 characters in production"
    );
    ensure(process.env.ADMIN_EMAIL, "ADMIN_EMAIL is required in production");
    ensure(process.env.ADMIN_PASSWORD, "ADMIN_PASSWORD is required in production");
    ensure(
      process.env.ADMIN_PASSWORD.length >= 12,
      "ADMIN_PASSWORD must be at least 12 characters in production"
    );
  }
};

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  isProduction: process.env.NODE_ENV === "production",
  port: Number(process.env.PORT || 5000),
  clientOrigins: parseOrigins(process.env.CLIENT_URL || "http://localhost:3000"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "1d",
  authWindowMs: Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
  authMaxRequests: Number(process.env.AUTH_RATE_LIMIT_MAX || 10),
  apiWindowMs: Number(process.env.API_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
  apiMaxRequests: Number(process.env.API_RATE_LIMIT_MAX || 300)
};

module.exports = { env, validateEnv };
