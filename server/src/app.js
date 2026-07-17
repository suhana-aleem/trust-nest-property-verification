const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const mongoSanitize = require("express-mongo-sanitize");
const xssClean = require("xss-clean");
const { env } = require("./config/env");
const { getDbStatus } = require("./config/db");
const { requestContext } = require("./middlewares/requestContext");
const { buildRateLimiter } = require("./middlewares/rateLimit");

const authRoutes = require("./routes/authRoutes");
const documentRoutes = require("./routes/documentRoutes");
const auditRoutes = require("./routes/auditRoutes");
const verificationRoutes = require("./routes/verificationRoutes");
const { errorHandler } = require("./middlewares/errorHandler");

const app = express();

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || env.clientOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("CORS origin not allowed"));
    },
    credentials: true
  })
);
app.use(
  helmet({
    crossOriginResourcePolicy: false
  })
);
app.use(requestContext);
app.use(
  morgan(":method :url :status :response-time ms - req_id=:req[x-request-id]")
);
app.use(express.json({ limit: "2mb" }));
app.use(mongoSanitize());
app.use(xssClean());
app.use(
  buildRateLimiter({
    windowMs: env.apiWindowMs,
    max: env.apiMaxRequests,
    message: "Too many requests. Please slow down and try again shortly."
  })
);

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "property-document-verifier-api",
    environment: env.nodeEnv,
    timestamp: new Date().toISOString()
  });
});

app.get("/api/ready", (req, res) => {
  const database = getDbStatus();
  const isReady = database === "connected";

  res.status(isReady ? 200 : 503).json({
    status: isReady ? "ready" : "degraded",
    checks: {
      database
    },
    timestamp: new Date().toISOString()
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/audit-logs", auditRoutes);
app.use("/api", verificationRoutes);

app.use(errorHandler);

module.exports = app;
