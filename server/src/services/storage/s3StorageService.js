const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand
} = require("@aws-sdk/client-s3");
const { randomUUID } = require("crypto");
const { Readable } = require("stream");

const required = (value, key) => {
  if (!value) {
    throw new Error(`${key} is required when STORAGE_PROVIDER=s3`);
  }
  return value;
};

const bucket = () => required(process.env.STORAGE_BUCKET, "STORAGE_BUCKET");

const getClient = () =>
  new S3Client({
    region: process.env.STORAGE_REGION || "us-east-1",
    endpoint: process.env.STORAGE_ENDPOINT || undefined,
    forcePathStyle: String(process.env.STORAGE_FORCE_PATH_STYLE || "false").toLowerCase() === "true",
    credentials:
      process.env.STORAGE_ACCESS_KEY_ID && process.env.STORAGE_SECRET_ACCESS_KEY
        ? {
            accessKeyId: process.env.STORAGE_ACCESS_KEY_ID,
            secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY
          }
        : undefined
  });

const streamToBuffer = async (stream) => {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
};

const save = async ({ buffer, extension, mimeType }) => {
  const objectKey = `${randomUUID()}${extension}`;
  const client = getClient();

  await client.send(
    new PutObjectCommand({
      Bucket: bucket(),
      Key: objectKey,
      Body: buffer,
      ContentType: mimeType
    })
  );

  const publicUrl = process.env.STORAGE_PUBLIC_BASE_URL
    ? `${process.env.STORAGE_PUBLIC_BASE_URL.replace(/\/+$/, "")}/${objectKey}`
    : "";

  return {
    provider: "s3",
    objectKey,
    localPath: "",
    publicUrl,
    size: buffer.length
  };
};

const read = async (storage) => {
  const client = getClient();
  const response = await client.send(
    new GetObjectCommand({
      Bucket: bucket(),
      Key: storage.objectKey
    })
  );

  if (response.Body instanceof Readable || response.Body?.[Symbol.asyncIterator]) {
    return streamToBuffer(response.Body);
  }

  return Buffer.from([]);
};

const remove = async (storage) => {
  if (!storage?.objectKey) return;
  const client = getClient();
  await client.send(
    new DeleteObjectCommand({
      Bucket: bucket(),
      Key: storage.objectKey
    })
  );
};

module.exports = { save, read, remove };
