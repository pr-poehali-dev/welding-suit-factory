import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { boFetch, Worker } from "@/pages/backoffice/types";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const EMPTY: Partial<Worker> = {
  tab_number: "", full_name: "", position: "", phone: "", hourly_rate: 0, is_active: true,
};

export default function WorkersPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Worker>>(EMPTY);

  const { data: workers = [], isLoading } = useQuery<Worker[]>({
    queryKey: ["bo-workers"],
    queryFn: () => boFetch("workers"),
  });

  const save = useMutation({
    mutationFn: (data: Partial<Worker>) =>
      boFetch("workers", data.id ? "PUT" : "POST", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bo-workers"] });
      toast({ title: "Сохранено" });
      setOpen(false);
    },
    onError: (e: Error) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: (id: number) => boFetch("workers", "DELETE", { id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bo-workers"] });
      toast({ title: "Удалено" });
    },
    onError: (e: Error) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  const openNew = () => { setForm(EMPTY); setOpen(true); };
  const openEdit = (w: Worker) => { setForm({ ...w }); setOpen(true); };

  const f = (key: keyof Worker) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [key]: e.target.value });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Сотрудники</h1>
        <Button onClick={openNew} className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white">
          <Icon name="Plus" size={16} /> Добавить
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-slate-400"><Icon name="Loader2" size={20} className="animate-spin" /> Загрузка...</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">Таб. номер</th>
                <th className="px-4 py-3">ФИО</th>
                <th className="px-4 py-3">Должность</th>
                <th className="px-4 py-3">Ставка, р/ч</th>
                <th className="px-4 py-3">Телефон</th>
                <th className="px-4 py-3">Активен</th>
                <th className="px-4 py-3 text-right">Действия</th>
              </tr>
            </thead>
            <tbody>
              {workers.map((w, i) => (
                <tr key={w.id} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                  <td className="px-4 py-2.5 font-mono text-slate-600">{w.tab_number}</td>
                  <td className="px-4 py-2.5 font-medium text-slate-700">{w.full_name}</td>
                  <td className="px-4 py-2.5 text-slate-600">{w.position}</td>
                  <td className="px-4 py-2.5 text-slate-600">{Number(w.hourly_rate).toLocaleString("ru")}</td>
                  <td className="px-4 py-2.5 text-slate-600">{w.phone || "-"}</td>
                  <td className="px-4 py-2.5">
                    {w.is_active ? (
                      <span className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-700">Да</span>
                    ) : (
                      <span className="rounded bg-red-100 px-2 py-0.5 text-xs text-red-700">Нет</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(w)}>
                        <Icon name="Pencil" size={15} />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => remove.mutate(w.id)}>
                        <Icon name="Trash2" size={15} className="text-red-500" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {workers.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">Нет записей</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* --- Dialog --- */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md bg-white text-slate-800">
          <DialogHeader>
            <DialogTitle>{form.id ? "Редактирование сотрудника" : "Новый сотрудник"}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">Табельный номер</label>
              <Input className="bg-white text-slate-800 border-slate-300" value={form.tab_number ?? ""} onChange={f("tab_number")} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">ФИО</label>
              <Input className="bg-white text-slate-800 border-slate-300" value={form.full_name ?? ""} onChange={f("full_name")} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">Должность</label>
              <Input className="bg-white text-slate-800 border-slate-300" value={form.position ?? ""} onChange={f("position")} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">Ставка (р/час)</label>
              <Input
                className="bg-white text-slate-800 border-slate-300"
                type="number"
                value={form.hourly_rate ?? 0}
                onChange={(e) => setForm({ ...form, hourly_rate: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">Телефон</label>
              <Input className="bg-white text-slate-800 border-slate-300" value={form.phone ?? ""} onChange={f("phone")} />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.is_active ?? true}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300"
              />
              <label className="text-sm text-slate-600">Активен</label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} className="text-slate-600 border-slate-300">Отмена</Button>
            <Button onClick={() => save.mutate(form)} disabled={save.isPending} className="bg-blue-600 hover:bg-blue-700 text-white">
              {save.isPending ? "Сохранение..." : "Сохранить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
