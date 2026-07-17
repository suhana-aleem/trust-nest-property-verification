import api from "./client";

export const loginApi = async (payload) => {
  const { data } = await api.post("/auth/login", payload);
  return data;
};

export const adminLoginApi = async (payload) => {
  const { data } = await api.post("/auth/admin/login", payload);
  return data;
};

export const registerApi = async (payload) => {
  const { data } = await api.post("/auth/register", payload);
  return data;
};

export const inviteRegisterApi = async (payload) => {
  const { data } = await api.post("/auth/admin/invite-register", payload);
  return data;
};

export const getMeApi = async () => {
  const { data } = await api.get("/auth/me");
  return data;
};

export const refreshTokenApi = async (payload) => {
  const { data } = await api.post("/auth/refresh", payload);
  return data;
};

export const logoutApi = async (payload) => {
  const { data } = await api.post("/auth/logout", payload);
  return data;
};

export const getAdminUsersApi = async () => {
  const { data } = await api.get("/auth/admin/users");
  return data;
};

export const blockUserApi = async (id, payload = {}) => {
  const { data } = await api.patch(`/auth/admin/users/${id}/block`, payload);
  return data;
};

export const unblockUserApi = async (id) => {
  const { data } = await api.patch(`/auth/admin/users/${id}/unblock`);
  return data;
};

export const getInviteCodesApi = async () => {
  const { data } = await api.get("/auth/admin/invites");
  return data;
};

export const generateInviteApi = async (payload) => {
  const { data } = await api.post("/auth/admin/invites", payload);
  return data;
};
