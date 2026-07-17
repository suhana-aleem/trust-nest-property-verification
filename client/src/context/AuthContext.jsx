import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  adminLoginApi,
  getMeApi,
  inviteRegisterApi,
  loginApi,
  logoutApi,
  registerApi
} from "../api/authApi";
import { configureAuthClient, setAuthHeader } from "../api/client";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [refreshToken, setRefreshToken] = useState(localStorage.getItem("refreshToken") || "");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const persistSession = (data) => {
    localStorage.setItem("token", data.token);
    localStorage.setItem("refreshToken", data.refreshToken);
    setToken(data.token);
    setRefreshToken(data.refreshToken);
    setAuthHeader(data.token);
    setUser(data.user);
  };

  const clearSession = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    setAuthHeader(null);
    setToken("");
    setRefreshToken("");
    setUser(null);
  };

  useEffect(() => {
    configureAuthClient({
      getAccessToken: () => localStorage.getItem("token") || "",
      getRefreshToken: () => localStorage.getItem("refreshToken") || "",
      saveSession: persistSession,
      clearSession
    });
  }, []);

  useEffect(() => {
    const bootstrap = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        setAuthHeader(token);
        const data = await getMeApi();
        setUser(data.user);
      } catch {
        clearSession();
      } finally {
        setLoading(false);
      }
    };
    bootstrap();
  }, [token]);

  const login = async (payload) => {
    const data = await loginApi(payload);
    persistSession(data);
    return data;
  };

  const adminLogin = async (payload) => {
    const data = await adminLoginApi(payload);
    persistSession(data);
    return data;
  };

  const register = async (payload) => {
    const data = await registerApi(payload);
    persistSession(data);
    return data;
  };

  const inviteRegister = async (payload) => {
    const data = await inviteRegisterApi(payload);
    persistSession(data);
    return data;
  };

  const logout = async () => {
    try {
      if (refreshToken) {
        await logoutApi({ refreshToken });
      }
    } finally {
      clearSession();
    }
  };

  const value = useMemo(
    () => ({
      token,
      refreshToken,
      user,
      loading,
      login,
      adminLogin,
      register,
      inviteRegister,
      logout,
      isAuthenticated: Boolean(token)
    }),
    [token, refreshToken, user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
