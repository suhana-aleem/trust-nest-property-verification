const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");

const analyzeDocumentWithAI = async (filePath) => {
  if (!process.env.AI_API_URL) {
    const configError = new Error("AI_API_URL is not configured in server/.env");
    configError.statusCode = 500;
    throw configError;
  }

  if (!fs.existsSync(filePath)) {
    const fileError = new Error(`Document file not found on server: ${filePath}`);
    fileError.statusCode = 404;
    throw fileError;
  }

  const form = new FormData();
  form.append("file", fs.createReadStream(filePath));

  const baseUrl = String(process.env.AI_API_URL).replace(/\/+$/, "");

  try {
    const response = await axios.post(`${baseUrl}/analyze-document`, form, {
      headers: form.getHeaders(),
      timeout: 180000,
      maxBodyLength: Infinity,
      maxContentLength: Infinity
    });

    return response.data;
  } catch (error) {
    // Surface meaningful upstream Flask errors to client/Postman.
    if (error.response) {
      const upstreamMessage =
        error.response.data?.message ||
        error.response.data?.error ||
        `AI service failed with status ${error.response.status}`;
      const upstreamError = new Error(upstreamMessage);
      upstreamError.statusCode = error.response.status;
      throw upstreamError;
    }

    if (error.code === "ECONNABORTED") {
      const timeoutError = new Error(
        "AI service timeout. Keep Flask service running and retry with a smaller file."
      );
      timeoutError.statusCode = 504;
      throw timeoutError;
    }

    if (error.code === "ECONNREFUSED") {
      const connError = new Error(
        "AI service is unreachable. Verify AI_API_URL and ensure Flask is running on port 5001."
      );
      connError.statusCode = 502;
      throw connError;
    }

    const genericError = new Error(`AI integration failed: ${error.message}`);
    genericError.statusCode = 500;
    throw genericError;
  }
};

const analyzeDocumentBufferWithAI = async ({ buffer, fileName = "document.pdf" }) => {
  if (!process.env.AI_API_URL) {
    const configError = new Error("AI_API_URL is not configured in server/.env");
    configError.statusCode = 500;
    throw configError;
  }

  if (!buffer?.length) {
    const fileError = new Error("Document file buffer is empty");
    fileError.statusCode = 400;
    throw fileError;
  }

  const form = new FormData();
  form.append("file", buffer, fileName);

  const baseUrl = String(process.env.AI_API_URL).replace(/\/+$/, "");

  try {
    const response = await axios.post(`${baseUrl}/analyze-document`, form, {
      headers: form.getHeaders(),
      timeout: 180000,
      maxBodyLength: Infinity,
      maxContentLength: Infinity
    });

    return response.data;
  } catch (error) {
    if (error.response) {
      const upstreamMessage =
        error.response.data?.message ||
        error.response.data?.error ||
        `AI service failed with status ${error.response.status}`;
      const upstreamError = new Error(upstreamMessage);
      upstreamError.statusCode = error.response.status;
      throw upstreamError;
    }

    if (error.code === "ECONNABORTED") {
      const timeoutError = new Error(
        "AI service timeout. Keep Flask service running and retry with a smaller file."
      );
      timeoutError.statusCode = 504;
      throw timeoutError;
    }

    if (error.code === "ECONNREFUSED") {
      const connError = new Error(
        "AI service is unreachable. Verify AI_API_URL and ensure Flask is running on port 5001."
      );
      connError.statusCode = 502;
      throw connError;
    }

    const genericError = new Error(`AI integration failed: ${error.message}`);
    genericError.statusCode = 500;
    throw genericError;
  }
};

module.exports = { analyzeDocumentWithAI, analyzeDocumentBufferWithAI };
