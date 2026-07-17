const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const { loadEnv } = require("../src/config/loadEnv");

let mongoServer;

loadEnv();

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-secret-1234567890-test-secret";
process.env.JWT_EXPIRES_IN = "1d";
process.env.REFRESH_TOKEN_TTL_MS = "604800000";
process.env.ADMIN_EMAIL = "admin@system.com";
process.env.ADMIN_PASSWORD = "admin123secure";
process.env.CLIENT_URL = "http://localhost:3000";
process.env.AI_API_URL = "http://127.0.0.1:5001";
process.env.ETH_RPC_URL = "http://127.0.0.1:8545";
process.env.ETH_PRIVATE_KEY =
  "0x1111111111111111111111111111111111111111111111111111111111111111";
process.env.ETH_CONTRACT_ADDRESS = "0x1111111111111111111111111111111111111111";

const uploadsDir = path.join(__dirname, "..", "uploads");
const resolvedMongoUri =
  process.env.TEST_MONGODB_URI || process.env.MONGODB_URI || null;

jest.setTimeout(60000);

beforeAll(async () => {
  if (mongoose.connection.readyState === 1) {
    return;
  }

  if (resolvedMongoUri) {
    await mongoose.connect(resolvedMongoUri);
    return;
  }

  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterEach(async () => {
  if (mongoose.connection.readyState === 1) {
    const { collections } = mongoose.connection;
    await Promise.all(Object.values(collections).map((collection) => collection.deleteMany({})));
  }

  if (fs.existsSync(uploadsDir)) {
    for (const file of fs.readdirSync(uploadsDir)) {
      fs.unlinkSync(path.join(uploadsDir, file));
    }
  }
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (mongoServer) {
    await mongoServer.stop();
  }
});
