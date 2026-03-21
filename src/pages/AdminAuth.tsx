import Icon from "@/components/ui/icon";
import { inp, inpSt } from "./shared.types";

interface AdminAuthProps {
  password: string;
  setPassword: (v: string) => void;
  authError: string;
  setAuthError: (v: string) => void;
  authLoading: boolean;
  onAuth: () => void;
}

export default function AdminAuth({ password, setPassword, authError, setAuthError, authLoading, onAuth }: AdminAuthProps) {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#0d1117" }}>
      <div className="w-full max-w-sm rounded-lg p-8" style={{ background: "#13181f", border: "1px solid rgba(245,124,0,0.25)" }}>
        <div className="flex items-center gap-3 mb-8">
          <div className="w-8 h-8 flex items-center justify-center" style={{ background: "#f57c00" }}>
            <Icon name="Flame" size={16} style={{ color: "#0d1117" }} />
          </div>
          <span className="font-bold text-lg tracking-widest uppercase" style={{ fontFamily: "'Oswald', sans-serif", color: "#f57c00" }}>СПЕЦНАЗ</span>
        </div>
        <h1 className="text-2xl font-bold mb-1" style={{ fontFamily: "'Oswald', sans-serif", color: "#ffffff" }}>ВХОД В АДМИН-ПАНЕЛЬ</h1>
        <p className="text-sm mb-6" style={{ color: "#8a9ab5" }}>Полный доступ к управлению</p>
        <div className="space-y-3">
          <input type="password" value={password} onChange={e => { setPassword(e.target.value); setAuthError(""); }}
            onKeyDown={e => e.key === "Enter" && !authLoading && onAuth()}
            placeholder="Введите пароль" className={inp} style={{ ...inpSt, border: authError ? "1px solid rgba(248,113,113,0.5)" : inpSt.border }} />
          {authError && (
            <div className="text-sm px-3 py-2 rounded" style={{ color: "#f87171", background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)" }}>
              {authError}
            </div>
          )}
          <button onClick={onAuth} disabled={authLoading || !password.trim()} className="w-full py-3 text-sm font-bold rounded"
            style={{ background: "#f57c00", color: "#0d1117", fontFamily: "'Oswald', sans-serif", letterSpacing: "0.05em", cursor: authLoading || !password.trim() ? "default" : "pointer", opacity: authLoading || !password.trim() ? 0.6 : 1 }}>
            {authLoading ? "Проверяю..." : "Войти"}
          </button>
        </div>
        <div className="mt-6 text-center">
          <a href="/" className="text-xs" style={{ color: "#8a9ab5" }}>← На сайт</a>
        </div>
      </div>
    </div>
  );
}
