import api from "./client";

export const getDocumentsApi = async () => {
  const { data } = await api.get("/documents");
  return data;
};

export const getDocumentApi = async (id) => {
  const { data } = await api.get(`/documents/${id}`);
  return data;
};

export const uploadDocumentApi = async (payload) => {
  const form = new FormData();
  form.append("title", payload.title);
  form.append("propertyId", payload.propertyId);
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

export const getVersionsApi = async (id) => {
  const { data } = await api.get(`/documents/${id}/versions`);
  return data;
};
