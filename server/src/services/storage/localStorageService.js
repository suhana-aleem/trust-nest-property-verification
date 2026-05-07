const fs = require("fs");
const path = require("path");
const { randomUUID } = require("crypto");

const uploadsDir = path.join(__dirname, "..", "..", "uploads");

const ensureUploadsDir = () => {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
};

const save = async ({ buffer, extension }) => {
  ensureUploadsDir();
  const objectKey = `${randomUUID()}${extension}`;
  const localPath = path.join(uploadsDir, objectKey);

  await fs.promises.writeFile(localPath, buffer);

  return {
    provider: "local",
    objectKey,
    localPath,
    publicUrl: "",
    size: buffer.length
  };
};

const read = async (storage) => fs.promises.readFile(storage.localPath);

const remove = async (storage) => {
  if (storage?.localPath && fs.existsSync(storage.localPath)) {
    await fs.promises.unlink(storage.localPath);
  }
};

module.exports = { save, read, remove };
