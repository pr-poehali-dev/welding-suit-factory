import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import {
  authFetch,
  getAuthToken,
  setAuthToken,
  AuthUser,
  Permissions,
} from "@/pages/backoffice/types";

interface AuthState {
  user: AuthUser | null;
  permissions: Permissions;
  loading: boolean;
  login: (login: string, password: string) => Promise<void>;
  logout: () => void;
  can: (key: string) => boolean;
  canModule: (module: string) => boolean;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [permissions, setPermissions] = useState<Permissions>({});
  const [loading, setLoading] = useState(true);

  const applyAuth = (u: AuthUser | null, p: Permissions) => {
    setUser(u);
    setPermissions(p || {});
  };

  const refresh = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      applyAuth(null, {});
      setLoading(false);
      return;
    }
    try {
      const data = await authFetch("me");
      applyAuth(data.user, data.permissions);
    } catch {
      setAuthToken(null);
      applyAuth(null, {});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const onUnauthorized = () => {
      setAuthToken(null);
      applyAuth(null, {});
    };
    window.addEventListener("bo-unauthorized", onUnauthorized);
    return () => window.removeEventListener("bo-unauthorized", onUnauthorized);
  }, [refresh]);

  const login = async (loginValue: string, password: string) => {
    const data = await authFetch("login", { login: loginValue, password });
    setAuthToken(data.token);
    applyAuth(data.user, data.permissions);
  };

  const logout = () => {
    authFetch("logout").catch(() => {});
    setAuthToken(null);
    applyAuth(null, {});
  };

  const can = useCallback(
    (key: string) => {
      if (permissions["__all__"]) return true;
      return !!permissions[key];
    },
    [permissions],
  );

  const canModule = useCallback(
    (module: string) => {
      if (permissions["__all__"]) return true;
      return !!permissions[`${module}.view`] || !!permissions[`${module}.edit`];
    },
    [permissions],
  );

  return (
    <AuthContext.Provider value={{ user, permissions, loading, login, logout, can, canModule }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
