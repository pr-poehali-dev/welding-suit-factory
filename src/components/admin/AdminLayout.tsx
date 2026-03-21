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
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("admin_token")) setAuthed(true);
  }, []);

  const handleAuth = async () => {
    if (blocked) return;
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
      } else if (data.error === "too_many_attempts") {
        setAuthError(data.message);
        setBlocked(true);
      } else {
        const msg = typeof data.remaining === "number"
          ? `Неверный пароль. Осталось попыток: ${data.remaining}`
          : "Неверный пароль";
        setAuthError(msg);
        if (data.remaining !== undefined && data.remaining <= 0) setBlocked(true);
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