import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import api from "../services/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadUser = async () => {
      const token = localStorage.getItem("tableflow_token");

      if (!token) {
        if (active) setLoading(false);
        return;
      }

      try {
        const response = await api.get("/auth/me");

        if (active) {
          setUser(response.data.user);
        }
      } catch (error) {
        console.error("Failed to load user:", error);

        localStorage.removeItem("tableflow_token");

        if (active) setUser(null);
      } finally {
        if (active) setLoading(false);
      }
    };

    loadUser();

    return () => {
      active = false;
    };
  }, []);

  const saveAuth = (data) => {
    localStorage.setItem("tableflow_token", data.token);
    setUser(data.user);
    return data;
  };

  const register = async (name, email, password, role) => {
    const response = await api.post("/auth/register", {
      name,
      email,
      password,
      role,
    });

    return saveAuth(response.data);
  };

  const login = async (email, password) => {
    const response = await api.post("/auth/login", {
      email,
      password,
    });

    return saveAuth(response.data);
  };

  // Existing Google accounts only.
  const googleLogin = async (credential) => {
    const response = await api.post("/auth/google/login", {
      credential,
    });

    return saveAuth(response.data);
  };

  // Verifies Google and checks for an existing account.
  // It does NOT create a user.
  const prepareGoogleRegistration = async (credential) => {
    const response = await api.post(
      "/auth/google/register/prepare",
      { credential }
    );

    return response.data;
  };

  // Creates the account only after a role has been selected.
  const completeGoogleRegistration = async (
    registrationToken,
    role
  ) => {
    const response = await api.post(
      "/auth/google/register/complete",
      {
        registrationToken,
        role,
      }
    );

    return saveAuth(response.data);
  };

  const logout = () => {
    localStorage.removeItem("tableflow_token");
    setUser(null);
  };

  const value = {
    user,
    loading,
    isAuthenticated: Boolean(user),
    register,
    login,
    googleLogin,
    prepareGoogleRegistration,
    completeGoogleRegistration,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);