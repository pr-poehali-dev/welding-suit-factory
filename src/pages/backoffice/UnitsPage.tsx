import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { boFetch, Unit } from "@/pages/backoffice/types";
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

const EMPTY: Partial<Unit> = { name: "", short_name: "" };

export default function UnitsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Unit>>(EMPTY);

  const { data: units = [], isLoading } = useQuery<Unit[]>({
    queryKey: ["bo-units"],
    queryFn: () => boFetch("units"),
  });

  const save = useMutation({
    mutationFn: (data: Partial<Unit>) =>
      boFetch("units", data.id ? "PUT" : "POST", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bo-units"] });
      toast({ title: "Сохранено" });
      setOpen(false);
    },
    onError: (e: Error) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: (id: number) => boFetch("units", "DELETE", { id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bo-units"] });
      toast({ title: "Удалено" });
    },
    onError: (e: Error) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  const openNew = () => { setForm(EMPTY); setOpen(true); };
  const openEdit = (u: Unit) => { setForm({ ...u }); setOpen(true); };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Единицы измерения</h1>
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
                <th className="px-4 py-3">Название</th>
                <th className="px-4 py-3">Сокращение</th>
                <th className="px-4 py-3">По умолчанию</th>
                <th className="px-4 py-3 text-right">Действия</th>
              </tr>
            </thead>
            <tbody>
              {units.map((u, i) => (
                <tr key={u.id} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                  <td className="px-4 py-2.5 font-medium text-slate-700">{u.name}</td>
                  <td className="px-4 py-2.5 text-slate-600">{u.short_name}</td>
                  <td className="px-4 py-2.5">
                    {u.is_default && <span className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-700">По умолчанию</span>}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(u)}>
                        <Icon name="Pencil" size={15} />
                      </Button>
                      {!u.is_default && (
                        <Button variant="ghost" size="sm" onClick={() => remove.mutate(u.id)}>
                          <Icon name="Trash2" size={15} className="text-red-500" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {units.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">Нет записей</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* --- Dialog --- */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-white text-slate-800">
          <DialogHeader>
            <DialogTitle>{form.id ? "Редактирование" : "Новая единица измерения"}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-3">
            <label className="text-sm font-medium text-slate-600">Название</label>
            <Input
              className="bg-white text-slate-800 border-slate-300"
              value={form.name ?? ""}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Метр"
            />
            <label className="text-sm font-medium text-slate-600">Сокращение</label>
            <Input
              className="bg-white text-slate-800 border-slate-300"
              value={form.short_name ?? ""}
              onChange={(e) => setForm({ ...form, short_name: e.target.value })}
              placeholder="м"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} className="text-slate-600 border-slate-300">
              Отмена
            </Button>
            <Button
              onClick={() => save.mutate(form)}
              disabled={save.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {save.isPending ? "Сохранение..." : "Сохранить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
