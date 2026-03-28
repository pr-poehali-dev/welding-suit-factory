import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  boFetch,
  FinishedProduct,
  FinishedProductSemi,
  FinishedProductFitting,
  SemiProduct,
  Fitting,
} from "@/pages/backoffice/types";
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

const EMPTY: Partial<FinishedProduct> = {
  name: "", sku: "", description: "", base_price: 0, is_active: true,
  semi_products: [], fittings: [],
};

export default function FinishedProductsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<FinishedProduct>>(EMPTY);
  const [semiRows, setSemiRows] = useState<Partial<FinishedProductSemi>[]>([]);
  const [fitRows, setFitRows] = useState<Partial<FinishedProductFitting>[]>([]);

  /* --- данные --- */
  const { data: items = [], isLoading } = useQuery<FinishedProduct[]>({
    queryKey: ["bo-finished-products"],
    queryFn: () => boFetch("finished_products"),
  });
  const { data: semiProducts = [] } = useQuery<SemiProduct[]>({
    queryKey: ["bo-semi-products"],
    queryFn: () => boFetch("semi_products"),
  });
  const { data: fittings = [] } = useQuery<Fitting[]>({
    queryKey: ["bo-fittings"],
    queryFn: () => boFetch("fittings"),
  });

  /* --- мутации --- */
  const save = useMutation({
    mutationFn: (data: Partial<FinishedProduct>) =>
      boFetch("finished_products", data.id ? "PUT" : "POST", {
        ...data,
        semi_products: semiRows,
        fittings: fitRows,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bo-finished-products"] });
      toast({ title: "Сохранено" });
      setOpen(false);
    },
    onError: (e: Error) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: (id: number) => boFetch("finished_products", "DELETE", { id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bo-finished-products"] });
      toast({ title: "Удалено" });
    },
    onError: (e: Error) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  const openNew = () => {
    setForm(EMPTY);
    setSemiRows([]);
    setFitRows([]);
    setOpen(true);
  };

  const openEdit = (fp: FinishedProduct) => {
    setForm({
      id: fp.id, name: fp.name, sku: fp.sku, description: fp.description,
      base_price: fp.base_price, is_active: fp.is_active,
    });
    setSemiRows(fp.semi_products?.map((s) => ({ ...s })) ?? []);
    setFitRows(fp.fittings?.map((f) => ({ ...f })) ?? []);
    setOpen(true);
  };

  /* --- row helpers --- */
  const updateSemi = (idx: number, patch: Partial<FinishedProductSemi>) =>
    setSemiRows((p) => p.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  const removeSemi = (idx: number) => setSemiRows((p) => p.filter((_, i) => i !== idx));

  const updateFit = (idx: number, patch: Partial<FinishedProductFitting>) =>
    setFitRows((p) => p.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  const removeFit = (idx: number) => setFitRows((p) => p.filter((_, i) => i !== idx));

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Готовая продукция</h1>
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
                <th className="px-4 py-3">Артикул</th>
                <th className="px-4 py-3">Цена</th>
                <th className="px-4 py-3">Полуфабрикатов</th>
                <th className="px-4 py-3">Фурнитуры</th>
                <th className="px-4 py-3">Активен</th>
                <th className="px-4 py-3 text-right">Действия</th>
              </tr>
            </thead>
            <tbody>
              {items.map((fp, i) => (
                <tr key={fp.id} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                  <td className="px-4 py-2.5 font-medium text-slate-700">{fp.name}</td>
                  <td className="px-4 py-2.5 font-mono text-slate-600">{fp.sku}</td>
                  <td className="px-4 py-2.5 text-slate-600">{Number(fp.base_price).toLocaleString("ru")} r.</td>
                  <td className="px-4 py-2.5 text-slate-600">{fp.semi_products?.length ?? 0}</td>
                  <td className="px-4 py-2.5 text-slate-600">{fp.fittings?.length ?? 0}</td>
                  <td className="px-4 py-2.5">
                    {fp.is_active ? (
                      <span className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-700">Да</span>
                    ) : (
                      <span className="rounded bg-red-100 px-2 py-0.5 text-xs text-red-700">Нет</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(fp)}>
                        <Icon name="Pencil" size={15} />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => remove.mutate(fp.id)}>
                        <Icon name="Trash2" size={15} className="text-red-500" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">Нет записей</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* --- Dialog --- */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl bg-white text-slate-800 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "Редактирование продукции" : "Новая продукция"}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-600">Название</label>
                <Input className="bg-white text-slate-800 border-slate-300" value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-600">Артикул</label>
                <Input className="bg-white text-slate-800 border-slate-300" value={form.sku ?? ""} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">Базовая цена</label>
              <Input
                className="bg-white text-slate-800 border-slate-300"
                type="number"
                step="0.01"
                value={form.base_price ?? 0}
                onChange={(e) => setForm({ ...form, base_price: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">Описание</label>
              <Textarea className="bg-white text-slate-800 border-slate-300" value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={form.is_active ?? true} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="h-4 w-4 rounded border-slate-300" />
              <label className="text-sm text-slate-600">Активен</label>
            </div>
          </div>

          {/* --- Полуфабрикаты --- */}
          <div className="mt-4 border-t border-slate-200 pt-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700">Полуфабрикаты</h3>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSemiRows([...semiRows, { semi_product_id: 0, qty: 1 }])}
                className="gap-1 text-slate-600 border-slate-300"
              >
                <Icon name="Plus" size={14} /> Добавить
              </Button>
            </div>
            {semiRows.map((row, idx) => (
              <div key={idx} className="mb-2 flex items-end gap-2">
                <div className="flex-1">
                  <label className="mb-1 block text-xs text-slate-500">Полуфабрикат</label>
                  <select
                    className="flex h-9 w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-800"
                    value={row.semi_product_id ?? 0}
                    onChange={(e) => updateSemi(idx, { semi_product_id: Number(e.target.value) })}
                  >
                    <option value={0}>-- выберите --</option>
                    {semiProducts.filter((s) => s.is_active).map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div className="w-24">
                  <label className="mb-1 block text-xs text-slate-500">Кол-во</label>
                  <Input
                    className="h-9 bg-white text-slate-800 border-slate-300"
                    type="number"
                    min={1}
                    value={row.qty ?? 1}
                    onChange={(e) => updateSemi(idx, { qty: Number(e.target.value) })}
                  />
                </div>
                <Button size="sm" variant="ghost" onClick={() => removeSemi(idx)}>
                  <Icon name="X" size={14} className="text-red-500" />
                </Button>
              </div>
            ))}
            {semiRows.length === 0 && <p className="text-xs text-slate-400">Нет полуфабрикатов</p>}
          </div>

          {/* --- Фурнитура --- */}
          <div className="mt-4 border-t border-slate-200 pt-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700">Фурнитура</h3>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setFitRows([...fitRows, { fitting_id: 0, qty: 1 }])}
                className="gap-1 text-slate-600 border-slate-300"
              >
                <Icon name="Plus" size={14} /> Добавить
              </Button>
            </div>
            {fitRows.map((row, idx) => (
              <div key={idx} className="mb-2 flex items-end gap-2">
                <div className="flex-1">
                  <label className="mb-1 block text-xs text-slate-500">Фурнитура</label>
                  <select
                    className="flex h-9 w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-800"
                    value={row.fitting_id ?? 0}
                    onChange={(e) => updateFit(idx, { fitting_id: Number(e.target.value) })}
                  >
                    <option value={0}>-- выберите --</option>
                    {fittings.filter((f) => f.is_active).map((f) => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>
                <div className="w-24">
                  <label className="mb-1 block text-xs text-slate-500">Кол-во</label>
                  <Input
                    className="h-9 bg-white text-slate-800 border-slate-300"
                    type="number"
                    min={1}
                    value={row.qty ?? 1}
                    onChange={(e) => updateFit(idx, { qty: Number(e.target.value) })}
                  />
                </div>
                <Button size="sm" variant="ghost" onClick={() => removeFit(idx)}>
                  <Icon name="X" size={14} className="text-red-500" />
                </Button>
              </div>
            ))}
            {fitRows.length === 0 && <p className="text-xs text-slate-400">Нет фурнитуры</p>}
          </div>

          <DialogFooter className="mt-4">
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
