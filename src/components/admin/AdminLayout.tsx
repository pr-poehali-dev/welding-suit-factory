import { useState, useEffect } from "react";
import AdminAuth from "@/pages/AdminAuth";
import { API } from "@/pages/shared.types";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("admin_token")) setAuthed(true);
  }, []);

  const handleAuth = async () => {
    setAuthLoading(true);
    setAuthError("");
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "auth", role: "admin", password }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      const data = await res.json();
      if (data.ok) {
        sessionStorage.setItem("admin_token", password);
        setAuthed(true);
      } else {
        setAuthError("Неверный пароль");
      }
    } catch {
      setAuthError("Ошибка соединения. Попробуйте ещё раз.");
    }
    setAuthLoading(false);
  };

  if (!authed) {
    return (
      <AdminAuth
        password={password}
        setPassword={setPassword}
        authError={authError}
        setAuthError={setAuthError}
        authLoading={authLoading}
        onAuth={handleAuth}
      />
    );
  }

  return <>{children}</>;
}