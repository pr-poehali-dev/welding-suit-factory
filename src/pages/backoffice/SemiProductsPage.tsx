import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  boFetch,
  SemiProduct,
  SemiProductMaterial,
  SemiProductOperation,
  Material,
  Operation,
  Group,
} from "@/pages/backoffice/types";
import GroupManager, { buildTree, collectIds, TreeGroup } from "@/components/backoffice/GroupManager";
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

/* ---------- пустые шаблоны ---------- */
const EMPTY_SP: Partial<SemiProduct> = {
  name: "", sku: "", description: "", is_active: true, materials: [], operations: [], group_id: null,
};
const EMPTY_MAT: Partial<SemiProductMaterial> = { material_id: 0, norm_qty: 0, notes: "" };
const EMPTY_OP: Partial<SemiProductOperation> = { operation_id: 0, labor_cost: 0, sort_order: 0, notes: "" };

export default function SemiProductsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<SemiProduct>>(EMPTY_SP);
  const [matRows, setMatRows] = useState<Partial<SemiProductMaterial>[]>([]);
  const [opRows, setOpRows] = useState<Partial<SemiProductOperation>[]>([]);
  const [groupFilter, setGroupFilter] = useState<number | null>(null);

  /* --- данные --- */
  const { data: items = [], isLoading } = useQuery<SemiProduct[]>({
    queryKey: ["bo-semi-products"],
    queryFn: () => boFetch("semi_products"),
  });
  const { data: materials = [] } = useQuery<Material[]>({
    queryKey: ["bo-materials"],
    queryFn: () => boFetch("materials"),
  });
  const { data: operations = [] } = useQuery<Operation[]>({
    queryKey: ["bo-operations"],
    queryFn: () => boFetch("operations"),
  });
  const { data: groups = [] } = useQuery<Group[]>({
    queryKey: ["bo-groups", "semi_products"],
    queryFn: () => boFetch("groups", "GET", undefined, { entity_type: "semi_products" }),
  });

  /* --- мутации --- */
  const save = useMutation({
    mutationFn: (data: Partial<SemiProduct>) =>
      boFetch("semi_products", data.id ? "PUT" : "POST", {
        ...data,
        materials: matRows,
        operations: opRows,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bo-semi-products"] });
      toast({ title: "Сохранено" });
      setOpen(false);
    },
    onError: (e: Error) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: (id: number) => boFetch("semi_products", "DELETE", { id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bo-semi-products"] });
      toast({ title: "Удалено" });
    },
    onError: (e: Error) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  /* --- helpers --- */
  const openNew = () => {
    setForm(EMPTY_SP);
    setMatRows([]);
    setOpRows([]);
    setOpen(true);
  };

  const openEdit = (sp: SemiProduct) => {
    setForm({ id: sp.id, name: sp.name, sku: sp.sku, description: sp.description, is_active: sp.is_active, group_id: sp.group_id ?? null });
    setMatRows(sp.materials?.map((m) => ({ ...m })) ?? []);
    setOpRows(sp.operations?.map((o) => ({ ...o })) ?? []);
    setOpen(true);
  };

  /* --- row helpers --- */
  const updateMat = (idx: number, patch: Partial<SemiProductMaterial>) =>
    setMatRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  const removeMat = (idx: number) => setMatRows((prev) => prev.filter((_, i) => i !== idx));

  const updateOp = (idx: number, patch: Partial<SemiProductOperation>) =>
    setOpRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  const removeOp = (idx: number) => setOpRows((prev) => prev.filter((_, i) => i !== idx));

  /* --- группы: подсчёт и фильтрация --- */
  const groupCounts = (() => {
    const c: Record<number | string, number> = { all: items.length, ungrouped: 0 };
    items.forEach((sp) => {
      if (sp.group_id) c[sp.group_id] = (c[sp.group_id] || 0) + 1;
      else c["ungrouped"] = (c["ungrouped"] || 0) + 1;
    });
    return c;
  })();

  const tree = buildTree(groups);
  function findNode(nodes: TreeGroup[], id: number): TreeGroup | null {
    for (const n of nodes) {
      if (n.id === id) return n;
      const found = findNode(n.children, id);
      if (found) return found;
    }
    return null;
  }

  const filtered = items.filter((sp) => {
    if (groupFilter === null) return true;
    if (groupFilter === -1) return !sp.group_id;
    const node = findNode(tree, groupFilter);
    if (!node) return sp.group_id === groupFilter;
    const ids = collectIds(node);
    return ids.includes(sp.group_id as number);
  });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Полуфабрикаты</h1>
        <Button onClick={openNew} className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white">
          <Icon name="Plus" size={16} /> Добавить
        </Button>
      </div>

      <div className="flex gap-4">
        <GroupManager entityType="semi_products" selectedGroupId={groupFilter} onSelect={setGroupFilter} counts={groupCounts} />

        <div className="flex-1 min-w-0">
          {isLoading ? (
            <div className="flex items-center gap-2 text-slate-400"><Icon name="Loader2" size={20} className="animate-spin" /> Загрузка...</div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    <th className="px-4 py-3">Название</th>
                    <th className="px-4 py-3">Артикул</th>
                    <th className="px-4 py-3">Материалов</th>
                    <th className="px-4 py-3">Операций</th>
                    <th className="px-4 py-3">Активен</th>
                    <th className="px-4 py-3 text-right">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((sp, i) => (
                    <tr key={sp.id} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                      <td className="px-4 py-2.5 font-medium text-slate-700">{sp.name}</td>
                      <td className="px-4 py-2.5 font-mono text-slate-600">{sp.sku}</td>
                      <td className="px-4 py-2.5 text-slate-600">{sp.materials?.length ?? 0}</td>
                      <td className="px-4 py-2.5 text-slate-600">{sp.operations?.length ?? 0}</td>
                      <td className="px-4 py-2.5">
                        {sp.is_active ? (
                          <span className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-700">Да</span>
                        ) : (
                          <span className="rounded bg-red-100 px-2 py-0.5 text-xs text-red-700">Нет</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(sp)}>
                            <Icon name="Pencil" size={15} />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => remove.mutate(sp.id)}>
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
        </div>
      </div>

      {/* --- Dialog --- */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl bg-white text-slate-800 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "Редактирование полуфабриката" : "Новый полуфабрикат"}</DialogTitle>
          </DialogHeader>

          {/* основные поля */}
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
              <label className="mb-1 block text-sm font-medium text-slate-600">Описание</label>
              <Textarea className="bg-white text-slate-800 border-slate-300" value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">Группа</label>
              <select
                className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
                value={form.group_id ?? ""}
                onChange={(e) => setForm({ ...form, group_id: e.target.value ? Number(e.target.value) : null })}
              >
                <option value="">— без группы —</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={form.is_active ?? true} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="h-4 w-4 rounded border-slate-300" />
              <label className="text-sm text-slate-600">Активен</label>
            </div>
          </div>

          {/* --- Секция: Материалы --- */}
          <div className="mt-4 border-t border-slate-200 pt-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700">Материалы</h3>
              <Button size="sm" variant="outline" onClick={() => setMatRows([...matRows, { ...EMPTY_MAT }])} className="gap-1 text-slate-600 border-slate-300">
                <Icon name="Plus" size={14} /> Добавить материал
              </Button>
            </div>

            {matRows.map((row, idx) => (
              <div key={idx} className="mb-2 flex items-end gap-2">
                <div className="flex-1">
                  <label className="mb-1 block text-xs text-slate-500">Материал</label>
                  <select
                    className="flex h-9 w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-800"
                    value={row.material_id ?? 0}
                    onChange={(e) => updateMat(idx, { material_id: Number(e.target.value) })}
                  >
                    <option value={0}>-- выберите --</option>
                    {materials.filter((m) => m.is_active).map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
                <div className="w-28">
                  <label className="mb-1 block text-xs text-slate-500">Норма</label>
                  <Input
                    className="h-9 bg-white text-slate-800 border-slate-300"
                    type="number"
                    step="0.001"
                    value={row.norm_qty ?? 0}
                    onChange={(e) => updateMat(idx, { norm_qty: Number(e.target.value) })}
                  />
                </div>
                <Button size="sm" variant="ghost" onClick={() => removeMat(idx)}>
                  <Icon name="X" size={14} className="text-red-500" />
                </Button>
              </div>
            ))}
            {matRows.length === 0 && <p className="text-xs text-slate-400">Материалы не добавлены</p>}
          </div>

          {/* --- Секция: Операции (ФОТ) --- */}
          <div className="mt-4 border-t border-slate-200 pt-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700">Операции (ФОТ)</h3>
              <Button size="sm" variant="outline" onClick={() => setOpRows([...opRows, { ...EMPTY_OP }])} className="gap-1 text-slate-600 border-slate-300">
                <Icon name="Plus" size={14} /> Добавить операцию
              </Button>
            </div>

            {opRows.map((row, idx) => (
              <div key={idx} className="mb-2 flex items-end gap-2">
                <div className="flex-1">
                  <label className="mb-1 block text-xs text-slate-500">Операция</label>
                  <select
                    className="flex h-9 w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-800"
                    value={row.operation_id ?? 0}
                    onChange={(e) => updateOp(idx, { operation_id: Number(e.target.value) })}
                  >
                    <option value={0}>-- выберите --</option>
                    {operations.filter((o) => o.is_active).map((o) => (
                      <option key={o.id} value={o.id}>{o.name}</option>
                    ))}
                  </select>
                </div>
                <div className="w-28">
                  <label className="mb-1 block text-xs text-slate-500">Стоимость</label>
                  <Input
                    className="h-9 bg-white text-slate-800 border-slate-300"
                    type="number"
                    step="0.01"
                    value={row.labor_cost ?? 0}
                    onChange={(e) => updateOp(idx, { labor_cost: Number(e.target.value) })}
                  />
                </div>
                <div className="w-20">
                  <label className="mb-1 block text-xs text-slate-500">Порядок</label>
                  <Input
                    className="h-9 bg-white text-slate-800 border-slate-300"
                    type="number"
                    value={row.sort_order ?? 0}
                    onChange={(e) => updateOp(idx, { sort_order: Number(e.target.value) })}
                  />
                </div>
                <Button size="sm" variant="ghost" onClick={() => removeOp(idx)}>
                  <Icon name="X" size={14} className="text-red-500" />
                </Button>
              </div>
            ))}
            {opRows.length === 0 && <p className="text-xs text-slate-400">Операции не добавлены</p>}
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