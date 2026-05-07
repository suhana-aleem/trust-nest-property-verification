const rateLimit = require("express-rate-limit");

const buildRateLimiter = ({
  windowMs,
  max,
  message,
  standardHeaders = true
}) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders,
    legacyHeaders: false,
    message: { message },
    keyGenerator: (req) => req.ip,
    handler: (req, res, next, options) => {
      res.status(options.statusCode).json({
        ...options.message,
        requestId: req.requestId
      });
    }
  });

module.exports = { buildRateLimiter };
