import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { boFetch, Material, Unit } from "@/pages/backoffice/types";
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

const EMPTY: Partial<Material> = {
  name: "", sku: "", unit_id: 0, price_per_unit: 0, description: "", is_active: true,
};

export default function MaterialsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Material>>(EMPTY);
  const [search, setSearch] = useState("");
  const [unitOpen, setUnitOpen] = useState(false);
  const [unitForm, setUnitForm] = useState({ name: "", short_name: "" });

  const { data: materials = [], isLoading } = useQuery<Material[]>({
    queryKey: ["bo-materials"],
    queryFn: () => boFetch("materials"),
  });

  const { data: units = [] } = useQuery<Unit[]>({
    queryKey: ["bo-units"],
    queryFn: () => boFetch("units"),
  });

  const save = useMutation({
    mutationFn: (data: Partial<Material>) =>
      boFetch("materials", data.id ? "PUT" : "POST", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bo-materials"] });
      toast({ title: "Сохранено" });
      setOpen(false);
    },
    onError: (e: Error) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: (id: number) => boFetch("materials", "DELETE", { id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bo-materials"] });
      toast({ title: "Удалено" });
    },
    onError: (e: Error) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  const openNew = () => { setForm({ ...EMPTY, unit_id: units[0]?.id ?? 0 }); setOpen(true); };
  const openEdit = (m: Material) => { setForm({ ...m }); setOpen(true); };

  const filtered = materials.filter((m) => {
    const q = search.toLowerCase();
    return m.name.toLowerCase().includes(q) || m.sku.toLowerCase().includes(q);
  });

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Материалы</h1>
        <div className="flex gap-2">
          <Input
            placeholder="Поиск..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-56 bg-white text-slate-800 border-slate-300"
          />
          <Button onClick={openNew} className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white">
            <Icon name="Plus" size={16} /> Добавить
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-slate-400"><Icon name="Loader2" size={20} className="animate-spin" /> Загрузка...</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">Название</th>
                <th className="px-4 py-3">Артикул</th>
                <th className="px-4 py-3">Ед. изм.</th>
                <th className="px-4 py-3">Цена за ед.</th>
                <th className="px-4 py-3">Активен</th>
                <th className="px-4 py-3 text-right">Действия</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m, i) => (
                <tr key={m.id} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                  <td className="px-4 py-2.5 font-medium text-slate-700">{m.name}</td>
                  <td className="px-4 py-2.5 font-mono text-slate-600">{m.sku}</td>
                  <td className="px-4 py-2.5 text-slate-600">{m.unit_short || m.unit_name || "-"}</td>
                  <td className="px-4 py-2.5 text-slate-600">{Number(m.price_per_unit).toLocaleString("ru")} r.</td>
                  <td className="px-4 py-2.5">
                    {m.is_active ? (
                      <span className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-700">Да</span>
                    ) : (
                      <span className="rounded bg-red-100 px-2 py-0.5 text-xs text-red-700">Нет</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(m)}>
                        <Icon name="Pencil" size={15} />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => remove.mutate(m.id)}>
                        <Icon name="Trash2" size={15} className="text-red-500" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Нет записей</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* --- Dialog --- */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md bg-white text-slate-800">
          <DialogHeader>
            <DialogTitle>{form.id ? "Редактирование материала" : "Новый материал"}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">Название</label>
              <Input className="bg-white text-slate-800 border-slate-300" value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">Артикул</label>
              <Input className="bg-white text-slate-800 border-slate-300" value={form.sku ?? ""} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">Единица измерения</label>
              <select
                className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
                value={form.unit_id ?? 0}
                onChange={(e) => setForm({ ...form, unit_id: Number(e.target.value) })}
              >
                <option value={0}>-- выберите --</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.short_name})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">Цена за единицу</label>
              <Input
                className="bg-white text-slate-800 border-slate-300"
                type="number"
                step="0.01"
                value={form.price_per_unit ?? 0}
                onChange={(e) => setForm({ ...form, price_per_unit: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">Описание</label>
              <Textarea
                className="bg-white text-slate-800 border-slate-300"
                value={form.description ?? ""}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
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