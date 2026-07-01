import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { boFetch, PeriodSettings } from "@/pages/backoffice/types";
import { useAuth } from "@/context/AuthContext";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";

export default function PeriodSettingsPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const isDirector = user?.access_level === "director";

  const [lockDate, setLockDate] = useState("");
  const [autoWeekly, setAutoWeekly] = useState(true);

  const { data, isLoading } = useQuery<PeriodSettings>({
    queryKey: ["bo-period-settings"],
    queryFn: () => boFetch("period_settings"),
  });

  useEffect(() => {
    if (data) {
      setLockDate(data.lock_date ?? "");
      setAutoWeekly(data.auto_weekly);
    }
  }, [data]);

  const save = useMutation({
    mutationFn: (payload: { lock_date: string | null; auto_weekly: boolean }) =>
      boFetch("period_settings", "PUT", payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bo-period-settings"] });
      toast({ title: "Настройки сохранены" });
    },
    onError: (e: Error) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  const unlock = () => {
    if (confirm("Снять блокировку периода полностью? Все прошлые документы снова станут доступны для редактирования.")) {
      save.mutate({ lock_date: null, auto_weekly: autoWeekly });
    }
  };

  const fmt = (iso: string | null) =>
    iso ? new Date(iso).toLocaleString("ru", { dateStyle: "long", timeStyle: "short" }) : "—";

  return (
    <div className="max-w-2xl">
      <h1 className="mb-1 text-2xl font-bold text-slate-800">Закрытие периода</h1>
      <p className="mb-6 text-sm text-slate-500">
        Документы (заказы, заказ-наряды, движения склада) с датой до указанной — доступны только для чтения.
      </p>

      {!isDirector ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-700">
          <Icon name="ShieldAlert" size={20} className="mb-1" />
          Управление закрытием периода доступно только директору.
        </div>
      ) : isLoading ? (
        <div className="flex items-center gap-2 text-slate-400">
          <Icon name="Loader2" size={20} className="animate-spin" /> Загрузка...
        </div>
      ) : (
        <div className="space-y-4">
          {/* текущее состояние */}
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center gap-2">
              <Icon
                name={data?.lock_date ? "Lock" : "LockOpen"}
                size={18}
                className={data?.lock_date ? "text-red-500" : "text-green-500"}
              />
              <span className="font-medium text-slate-700">
                {data?.lock_date
                  ? `Период закрыт до ${new Date(data.lock_date).toLocaleDateString("ru")}`
                  : "Период открыт (блокировки нет)"}
              </span>
            </div>
            <div className="text-xs text-slate-400">
              Последнее автозакрытие: {fmt(data?.last_auto_run ?? null)}
            </div>
          </div>

          {/* дата закрытия */}
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <label className="mb-1 block text-sm font-medium text-slate-600">
              Закрыть период до даты (включительно)
            </label>
            <Input
              type="date"
              value={lockDate}
              onChange={(e) => setLockDate(e.target.value)}
              className="max-w-xs border-slate-300 bg-white text-slate-800"
            />
            <p className="mt-1 text-xs text-slate-400">
              Всё, что датировано этой датой или ранее, нельзя будет изменить.
            </p>
          </div>

          {/* автозакрытие */}
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={autoWeekly}
                onChange={(e) => setAutoWeekly(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300"
              />
              <span>
                <span className="block text-sm font-medium text-slate-700">
                  Автоматическое закрытие раз в неделю
                </span>
                <span className="block text-xs text-slate-400">
                  Система автоматически закрывает всё, что старше 7 дней. Снять блокировку может только директор.
                </span>
              </span>
            </label>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => save.mutate({ lock_date: lockDate || null, auto_weekly: autoWeekly })}
              disabled={save.isPending}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              {save.isPending ? "Сохранение..." : "Сохранить"}
            </Button>
            {data?.lock_date && (
              <Button
                variant="outline"
                onClick={unlock}
                disabled={save.isPending}
                className="gap-1.5 border-red-200 text-red-600 hover:bg-red-50"
              >
                <Icon name="LockOpen" size={16} /> Снять блокировку
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
