import api from "./client";

export const getDocumentsApi = async () => {
  const { data } = await api.get("/documents");
  return data;
};

export const getOriginalDocumentsApi = async () => {
  const { data } = await api.get("/documents/originals");
  return data;
};

export const getDocumentApi = async (id) => {
  const { data } = await api.get(`/documents/${id}`);
  return data;
};

export const getDocumentPreviewBlobApi = async (id) => {
  const { data } = await api.get(`/documents/${id}/file`, {
    responseType: "blob"
  });
  return data;
};

export const uploadDocumentApi = async (payload) => {
  const form = new FormData();
  form.append("title", payload.title);
  form.append("propertyTitle", payload.propertyTitle);
  form.append("propertyId", payload.propertyId);
  if (payload.documentType) form.append("documentType", payload.documentType);
  if (payload.sourceDocumentId) form.append("sourceDocumentId", payload.sourceDocumentId);
  form.append("document", payload.file);

  const { data } = await api.post("/documents/upload", form, {
    headers: { "Content-Type": "multipart/form-data" }
  });
  return data;
};

export const analyzeDocumentApi = async (id) => {
  const { data } = await api.post(`/documents/${id}/analyze-ai`);
  return data;
};

export const verifyDocumentApi = async (documentId) => {
  const { data } = await api.post("/verify-document", { documentId });
  return data;
};

export const getVerificationReportApi = async (reportId) => {
  const { data } = await api.get(`/verification-report/${reportId}`);
  return data;
};

export const getLatestVerificationReportForDocumentApi = async (documentId) => {
  const { data } = await api.get(`/verification-report/document/${documentId}/latest`);
  return data;
};

export const getSuggestionsApi = async (id) => {
  const { data } = await api.get(`/documents/${id}/suggestions`);
  return data;
};

export const createSuggestionApi = async (id, payload) => {
  const { data } = await api.post(`/documents/${id}/suggestions`, payload);
  return data;
};

export const reviewSuggestionApi = async (id, suggestionId, payload) => {
  const { data } = await api.post(`/documents/${id}/suggestions/${suggestionId}/review`, payload);
  return data;
};

export const commentSuggestionApi = async (id, suggestionId, payload) => {
  const { data } = await api.post(`/documents/${id}/suggestions/${suggestionId}/comment`, payload);
  return data;
};

export const registerBlockchainApi = async (id) => {
  const { data } = await api.post(`/documents/${id}/register-blockchain`);
  return data;
};

export const verifyBlockchainApi = async (id) => {
  const { data } = await api.get(`/documents/${id}/verify-blockchain`);
  return data;
};

export const lockDocumentApi = async (id) => {
  const { data } = await api.post(`/documents/${id}/lock`);
  return data;
};

export const adminDecisionApi = async (id, payload) => {
  const { data } = await api.post(`/documents/${id}/admin-decision`, payload);
  return data;
};

export const approveSellerApi = async (id) => {
  const { data } = await api.post(`/documents/${id}/approve/seller`);
  return data;
};

export const approveBuyerApi = async (id) => {
  const { data } = await api.post(`/documents/${id}/approve/buyer`);
  return data;
};

export const approveLegalApi = async (id) => {
  const { data } = await api.post(`/documents/${id}/approve/legal`);
  return data;
};

export const approveRegistrarApi = async (id) => {
  const { data } = await api.post(`/documents/${id}/approve/registrar`);
  return data;
};

export const issueCertificateApi = async (id) => {
  const { data } = await api.post(`/documents/${id}/issue-certificate`);
  return data;
};

export const getCertificateApi = async (id, { download = false } = {}) => {
  const { data } = await api.get(`/documents/${id}/certificate`, {
    responseType: "blob",
    params: download ? { download: 1 } : undefined
  });
  return data;
};

export const deleteDocumentApi = async (id) => {
  const { data } = await api.delete(`/documents/${id}`);
  return data;
};

export const getVersionsApi = async (id) => {
  const { data } = await api.get(`/documents/${id}/versions`);
  return data;
};
