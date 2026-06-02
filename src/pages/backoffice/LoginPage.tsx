import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const { login } = useAuth();
  const [loginValue, setLoginValue] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(loginValue.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка входа");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center gap-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600">
            <Icon name="Factory" size={26} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-slate-800">Бэкофис</h1>
          <p className="text-sm text-slate-400">Швейное производство</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">Логин</label>
            <Input
              value={loginValue}
              onChange={(e) => setLoginValue(e.target.value)}
              placeholder="Введите логин"
              autoFocus
              className="bg-white text-slate-800 border-slate-300"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">Пароль</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Введите пароль"
              className="bg-white text-slate-800 border-slate-300"
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
          )}

          <Button
            type="submit"
            disabled={loading || !loginValue || !password}
            className="mt-2 gap-2 bg-blue-600 hover:bg-blue-700 text-white"
          >
            {loading ? <Icon name="Loader2" size={16} className="animate-spin" /> : <Icon name="LogIn" size={16} />}
            Войти
          </Button>
        </form>
      </div>
    </div>
  );
}
