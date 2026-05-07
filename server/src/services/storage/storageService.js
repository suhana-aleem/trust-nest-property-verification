const path = require("path");
const localStorageService = require("./localStorageService");
const s3StorageService = require("./s3StorageService");

const getAdapter = () => {
  const provider = process.env.STORAGE_PROVIDER || "local";

  if (provider === "local") {
    return localStorageService;
  }

  if (provider === "s3") {
    return s3StorageService;
  }

  if (provider !== "local") {
    throw new Error(
      `Unsupported STORAGE_PROVIDER "${provider}". Supported providers are "local" and "s3".`
    );
  }
};

const storeUploadedFile = async (file) => {
  if (!file?.buffer) {
    throw new Error("Upload buffer is missing");
  }

  const extension = path.extname(file.originalname || "").toLowerCase();
  const adapter = getAdapter();
  const stored = await adapter.save({
    buffer: file.buffer,
    extension,
    mimeType: file.mimetype
  });

  return {
    provider: stored.provider,
    objectKey: stored.objectKey,
    localPath: stored.localPath || "",
    publicUrl: stored.publicUrl || "",
    size: stored.size
  };
};

const readStoredFile = async (document) => {
  const adapter = getAdapter();
  return adapter.read(document.storage);
};

const removeStoredFile = async (document) => {
  const adapter = getAdapter();
  await adapter.remove(document.storage);
};

module.exports = {
  storeUploadedFile,
  readStoredFile,
  removeStoredFile
};
