const http = require("http");
const { Server } = require("socket.io");
const { loadEnv } = require("./config/loadEnv");
loadEnv();
const { env, validateEnv } = require("./config/env");
const app = require("./app");
const connectDB = require("./config/db");
const { initCollaborationSocket } = require("./sockets/collaborationSocket");

const startServer = async () => {
  validateEnv();
  await connectDB();

  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: env.clientOrigins,
      methods: ["GET", "POST"]
    }
  });

  initCollaborationSocket(io);

  const shutdown = (signal) => {
    console.log(`${signal} received. Shutting down gracefully...`);
    server.close(() => {
      console.log("HTTP server closed");
      process.exit(0);
    });
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  server.listen(env.port, () => {
    console.log(`Server running on port ${env.port}`);
  });
};

startServer().catch((error) => {
  console.error("Failed to start server:", error.message);
  process.exit(1);
});
