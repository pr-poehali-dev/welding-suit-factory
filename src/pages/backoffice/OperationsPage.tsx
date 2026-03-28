import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { boFetch, Operation } from "@/pages/backoffice/types";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const EMPTY: Partial<Operation> = {
  name: "", description: "", has_material_norm: false, default_price: 0, sort_order: 0, is_active: true,
};

export default function OperationsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Operation>>(EMPTY);

  const { data: operations = [], isLoading } = useQuery<Operation[]>({
    queryKey: ["bo-operations"],
    queryFn: () => boFetch("operations"),
  });

  const save = useMutation({
    mutationFn: (data: Partial<Operation>) =>
      boFetch("operations", data.id ? "PUT" : "POST", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bo-operations"] });
      toast({ title: "Сохранено" });
      setOpen(false);
    },
    onError: (e: Error) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: (id: number) => boFetch("operations", "DELETE", { id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bo-operations"] });
      toast({ title: "Удалено" });
    },
    onError: (e: Error) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  const openNew = () => { setForm(EMPTY); setOpen(true); };
  const openEdit = (o: Operation) => { setForm({ ...o }); setOpen(true); };

  const sorted = [...operations].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Операции</h1>
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
                <th className="px-4 py-3 w-12">#</th>
                <th className="px-4 py-3">Название</th>
                <th className="px-4 py-3">Описание</th>
                <th className="px-4 py-3">Норма расхода</th>
                <th className="px-4 py-3">Стоимость</th>
                <th className="px-4 py-3">Активен</th>
                <th className="px-4 py-3 text-right">Действия</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((o, i) => (
                <tr key={o.id} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                  <td className="px-4 py-2.5 text-slate-400">{o.sort_order}</td>
                  <td className="px-4 py-2.5 font-medium text-slate-700">{o.name}</td>
                  <td className="px-4 py-2.5 text-slate-600 max-w-xs truncate">{o.description || "-"}</td>
                  <td className="px-4 py-2.5">
                    {o.has_material_norm ? (
                      <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-700">Да</span>
                    ) : (
                      <span className="text-xs text-slate-400">Нет</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-slate-600">{Number(o.default_price).toLocaleString("ru")} r.</td>
                  <td className="px-4 py-2.5">
                    {o.is_active ? (
                      <span className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-700">Да</span>
                    ) : (
                      <span className="rounded bg-red-100 px-2 py-0.5 text-xs text-red-700">Нет</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(o)}>
                        <Icon name="Pencil" size={15} />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => remove.mutate(o.id)}>
                        <Icon name="Trash2" size={15} className="text-red-500" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {operations.length === 0 && (
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
            <DialogTitle>{form.id ? "Редактирование операции" : "Новая операция"}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">Название</label>
              <Input className="bg-white text-slate-800 border-slate-300" value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">Описание</label>
              <Textarea className="bg-white text-slate-800 border-slate-300" value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">Стоимость по умолчанию</label>
              <Input
                className="bg-white text-slate-800 border-slate-300"
                type="number"
                step="0.01"
                value={form.default_price ?? 0}
                onChange={(e) => setForm({ ...form, default_price: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">Порядок сортировки</label>
              <Input
                className="bg-white text-slate-800 border-slate-300"
                type="number"
                value={form.sort_order ?? 0}
                onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.has_material_norm ?? false}
                onChange={(e) => setForm({ ...form, has_material_norm: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300"
              />
              <label className="text-sm text-slate-600">Есть норма расхода материала</label>
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
