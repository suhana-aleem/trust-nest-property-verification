import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { adminLoginApi, getMeApi, inviteRegisterApi, loginApi, registerApi } from "../api/authApi";
import { setAuthHeader } from "../api/client";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

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
        localStorage.removeItem("token");
        setToken("");
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    bootstrap();
  }, [token]);

  const login = async (payload) => {
    const data = await loginApi(payload);
    localStorage.setItem("token", data.token);
    setToken(data.token);
    setAuthHeader(data.token);
    setUser(data.user);
    return data;
  };

  const adminLogin = async (payload) => {
    const data = await adminLoginApi(payload);
    localStorage.setItem("token", data.token);
    setToken(data.token);
    setAuthHeader(data.token);
    setUser(data.user);
    return data;
  };

  const register = async (payload) => {
    const data = await registerApi(payload);
    localStorage.setItem("token", data.token);
    setToken(data.token);
    setAuthHeader(data.token);
    setUser(data.user);
    return data;
  };

  const inviteRegister = async (payload) => {
    const data = await inviteRegisterApi(payload);
    localStorage.setItem("token", data.token);
    setToken(data.token);
    setAuthHeader(data.token);
    setUser(data.user);
    return data;
  };

  const logout = () => {
    localStorage.removeItem("token");
    setAuthHeader(null);
    setToken("");
    setUser(null);
  };

  const value = useMemo(
    () => ({
      token,
      user,
      loading,
      login,
      adminLogin,
      register,
      inviteRegister,
      logout,
      isAuthenticated: Boolean(token)
    }),
    [token, user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
