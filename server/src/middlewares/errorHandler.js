const errorHandler = (err, req, res, next) => {
  console.error(`[${req.requestId || "no-request-id"}]`, err);
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    message:
      statusCode >= 500 && process.env.NODE_ENV === "production"
        ? "Internal server error"
        : err.message || "Server error",
    code: err.code || undefined,
    requestId: req.requestId
  });
};

module.exports = { errorHandler };
