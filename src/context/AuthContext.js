import React, { createContext, useContext, useEffect, useState } from "react";
import { login as apiLogin, register as apiRegister } from "../services/api";
import {
  getToken,
  getUser,
  removeToken,
  removeUser,
  findLocalUser,
  saveLocalUser,
  saveToken,
  saveUser,
} from "../services/storage";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const [storedToken, storedUser] = await Promise.all([
          getToken(),
          getUser(),
        ]);
        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(storedUser);
        }
      } catch (error) {
        console.error("[AuthContext] restoreSession error:", error);
      } finally {
        setLoading(false);
      }
    };
    restoreSession();
  }, []);

  const login = async ({ email, password }) => {
    const employeeId = String(email).trim().toUpperCase();
    let data;
    try {
      data = await apiLogin({ email: employeeId, password });
      if (!data.success) throw new Error(data.message || "Login failed");
    } catch (error) {
      const localUser = await findLocalUser(employeeId);
      if (!localUser || localUser.password !== password) {
        throw new Error(error.message || "Login failed. Check Employee ID and password.");
      }
      data = {
        success: true,
        token: `local-token-${employeeId}`,
        employee_id: employeeId,
        name: localUser.name,
        userId: localUser.userId,
        offline: true,
      };
    }
    const token = data.token || `local-token-${employeeId}`;
    const user = {
      email: employeeId,
      employee_id: data.employee_id || employeeId,
      name: data.name || employeeId,
      userId: data.userId || `local_${employeeId}`,
      offline: data.offline === true,
    };
    await saveToken(String(token));
    await saveUser(user);
    setToken(String(token));
    setUser(user);
    return data;
  };

  const register = async ({ name, email, password }) => {
    const employeeId = String(email).trim().toUpperCase();
    let data;
    try {
      data = await apiRegister({ name, email: employeeId, password });
      if (!data.success) throw new Error(data.message || "Registration failed");
    } catch (error) {
      const localUser = await saveLocalUser({ name, employeeId, password });
      data = {
        success: true,
        token: `local-token-${employeeId}`,
        employee_id: employeeId,
        name: localUser.name,
        userId: localUser.userId,
        offline: true,
      };
    }
    const token = data.token || `local-token-${employeeId}`;
    const user = {
      name: data.name || name,
      email: employeeId,
      employee_id: data.employee_id || employeeId,
      userId: data.userId || `local_${employeeId}`,
      offline: data.offline === true,
    };
    await saveToken(String(token));
    await saveUser(user);
    setToken(String(token));
    setUser(user);
    return data;
  };

  const logout = async () => {
    await removeToken();
    await removeUser();
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, token, loading, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

export default AuthContext;
