import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  boFetch,
  SemiProduct,
  SemiProductMaterial,
  SemiProductOperation,
  Operation,
  Group,
  StockMaterial,
  PfType,
  PF_TYPE_LABELS,
  SemiProductComponent,
} from "@/pages/backoffice/types";
import GroupManager, { buildTree, collectIds, TreeGroup } from "@/components/backoffice/GroupManager";
import MaterialPicker from "@/components/backoffice/MaterialPicker";
import SemiGroupWizard from "@/components/backoffice/SemiGroupWizard";
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
  name: "", sku: "", description: "", is_active: true, pf_type: "material", materials: [], operations: [], group_id: null,
};
const EMPTY_OP: Partial<SemiProductOperation> = { operation_id: 0, labor_cost: 0, sort_order: 0, notes: "" };

const PF_TYPE_BADGE: Record<PfType, string> = {
  material: "bg-blue-100 text-blue-700",
  labor: "bg-orange-100 text-orange-700",
  fittings: "bg-purple-100 text-purple-700",
  composite: "bg-emerald-100 text-emerald-700",
};

export default function SemiProductsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<SemiProduct>>(EMPTY_SP);
  const [matRows, setMatRows] = useState<Partial<SemiProductMaterial>[]>([]);
  const [opRows, setOpRows] = useState<Partial<SemiProductOperation>[]>([]);
  const [compRows, setCompRows] = useState<Partial<SemiProductComponent>[]>([]);
  const [groupFilter, setGroupFilter] = useState<number | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [compPickerOpen, setCompPickerOpen] = useState(false);
  const [compQuery, setCompQuery] = useState("");

  /* --- данные --- */
  const { data: items = [], isLoading } = useQuery<SemiProduct[]>({
    queryKey: ["bo-semi-products"],
    queryFn: () => boFetch("semi_products"),
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
        components: compRows,
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

  const cloneSp = useMutation({
    mutationFn: (sp: SemiProduct) => {
      const name = window.prompt("Название копии:", sp.name + " (копия)");
      if (name === null) return Promise.reject(new Error("cancel"));
      return boFetch("clone_semi_product", "POST", { id: sp.id, name, group_id: sp.group_id });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bo-semi-products"] });
      toast({ title: "Полуфабрикат скопирован" });
    },
    onError: (e: Error) => {
      if (e.message !== "cancel")
        toast({ title: "Ошибка", description: e.message, variant: "destructive" });
    },
  });

  const cloneGroup = useMutation({
    mutationFn: (groupId: number) => {
      const name = window.prompt("Название новой группы:");
      if (name === null || !name.trim()) return Promise.reject(new Error("cancel"));
      return boFetch("clone_semi_group", "POST", { group_id: groupId, name: name.trim() });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bo-semi-products"] });
      qc.invalidateQueries({ queryKey: ["bo-groups", "semi_products"] });
      toast({ title: "Группа скопирована" });
    },
    onError: (e: Error) => {
      if (e.message !== "cancel")
        toast({ title: "Ошибка", description: e.message, variant: "destructive" });
    },
  });

  /* --- helpers --- */
  const openNew = () => {
    setForm({ ...EMPTY_SP, group_id: groupFilter && groupFilter > 0 ? groupFilter : null });
    setMatRows([]);
    setOpRows([]);
    setCompRows([]);
    setCompPickerOpen(false);
    setCompQuery("");
    setOpen(true);
  };

  const openEdit = (sp: SemiProduct) => {
    setForm({
      id: sp.id, name: sp.name, sku: sp.sku, description: sp.description,
      is_active: sp.is_active, group_id: sp.group_id ?? null,
      pf_type: sp.pf_type ?? "material", size_label: sp.size_label,
    });
    setMatRows(sp.materials?.map((m) => ({ ...m })) ?? []);
    setOpRows(sp.operations?.map((o) => ({ ...o })) ?? []);
    setCompRows(sp.components?.map((c) => ({ ...c })) ?? []);
    setCompPickerOpen(false);
    setCompQuery("");
    setOpen(true);
  };

  const addPickedMaterial = (m: StockMaterial, norm: number) => {
    setMatRows((prev) => [
      ...prev,
      { material_id: m.id, norm_qty: norm, notes: "", material_name: m.name, unit_short: m.unit_short },
    ]);
  };

  /* --- row helpers --- */
  const updateMat = (idx: number, patch: Partial<SemiProductMaterial>) =>
    setMatRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  const removeMat = (idx: number) => setMatRows((prev) => prev.filter((_, i) => i !== idx));

  const updateOp = (idx: number, patch: Partial<SemiProductOperation>) =>
    setOpRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  const removeOp = (idx: number) => setOpRows((prev) => prev.filter((_, i) => i !== idx));

  /* --- компоненты (вложенные п/ф) --- */
  const addComponent = (sp: SemiProduct) => {
    if (compRows.some((c) => c.component_id === sp.id)) return;
    setCompRows((prev) => [
      ...prev,
      { component_id: sp.id, qty: 1, component_name: sp.name, component_sku: sp.sku, component_type: sp.pf_type },
    ]);
    setCompPickerOpen(false);
    setCompQuery("");
  };
  const updateComp = (idx: number, patch: Partial<SemiProductComponent>) =>
    setCompRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  const removeComp = (idx: number) => setCompRows((prev) => prev.filter((_, i) => i !== idx));

  // кандидаты в компоненты: п/ф из той же группы, кроме самого себя и уже добавленных
  const componentCandidates = items.filter((sp) => {
    if (form.id && sp.id === form.id) return false;
    if (form.group_id && sp.group_id !== form.group_id) return false;
    if (compRows.some((c) => c.component_id === sp.id)) return false;
    const q = compQuery.trim().toLowerCase();
    if (q && !sp.name.toLowerCase().includes(q) && !(sp.sku || "").toLowerCase().includes(q)) return false;
    return true;
  });

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
        <div className="flex gap-2">
          <Button onClick={() => setWizardOpen(true)} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white">
            <Icon name="Wand2" size={16} /> Мастер создания ПФ модели
          </Button>
          <Button onClick={openNew} variant="outline" className="gap-1.5 border-slate-300 text-slate-600">
            <Icon name="Plus" size={16} /> Добавить
          </Button>
        </div>
      </div>

      <div className="flex gap-4">
        <GroupManager entityType="semi_products" selectedGroupId={groupFilter} onSelect={setGroupFilter} counts={groupCounts} />

        <div className="flex-1 min-w-0">
          {groupFilter !== null && groupFilter !== -1 && (
            <div className="mb-2 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => cloneGroup.mutate(groupFilter)}
                disabled={cloneGroup.isPending}
                className="gap-1.5 border-slate-300 text-slate-600"
              >
                <Icon name="Copy" size={14} /> Копировать группу
              </Button>
            </div>
          )}
          {isLoading ? (
            <div className="flex items-center gap-2 text-slate-400"><Icon name="Loader2" size={20} className="animate-spin" /> Загрузка...</div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    <th className="px-4 py-3">Название</th>
                    <th className="px-4 py-3">Тип</th>
                    <th className="px-4 py-3">Артикул / размер</th>
                    <th className="px-4 py-3">Мат.</th>
                    <th className="px-4 py-3">Опер.</th>
                    <th className="px-4 py-3 text-right">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((sp, i) => (
                    <tr key={sp.id} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                      <td className="px-4 py-2.5 font-medium text-slate-700">
                        {sp.name}
                        {!sp.is_active && (
                          <span className="ml-2 rounded bg-red-100 px-1.5 py-0.5 text-xs text-red-700">неактивен</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`rounded px-2 py-0.5 text-xs ${PF_TYPE_BADGE[(sp.pf_type ?? "material") as PfType]}`}>
                          {PF_TYPE_LABELS[(sp.pf_type ?? "material") as PfType]}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-500">
                        {sp.parent_group_name && <div className="text-slate-700">{sp.parent_group_name}</div>}
                        {sp.size_label && <div>{sp.size_label}</div>}
                        {!sp.parent_group_name && !sp.size_label && <span className="font-mono">{sp.sku}</span>}
                      </td>
                      <td className="px-4 py-2.5 text-slate-600">{sp.materials?.length ?? 0}</td>
                      <td className="px-4 py-2.5 text-slate-600">{sp.operations?.length ?? 0}</td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" title="Редактировать" onClick={() => openEdit(sp)}>
                            <Icon name="Pencil" size={15} />
                          </Button>
                          <Button variant="ghost" size="sm" title="Копировать" onClick={() => cloneSp.mutate(sp)}>
                            <Icon name="Copy" size={15} className="text-slate-500" />
                          </Button>
                          <Button variant="ghost" size="sm" title="Удалить" onClick={() => remove.mutate(sp.id)}>
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-600">Тип полуфабриката</label>
                <select
                  className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
                  value={form.pf_type ?? "material"}
                  onChange={(e) => setForm({ ...form, pf_type: e.target.value as PfType })}
                >
                  <option value="material">Материальный</option>
                  <option value="labor">ФОТ (труд)</option>
                  <option value="fittings">Фурнитура</option>
                </select>
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
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={form.is_active ?? true} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="h-4 w-4 rounded border-slate-300" />
              <label className="text-sm text-slate-600">Активен</label>
            </div>
          </div>

          {/* --- Секция: Материалы (спецификация) --- */}
          <div className="mt-4 border-t border-slate-200 pt-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700">Спецификация (материалы)</h3>
              <Button size="sm" variant="outline" onClick={() => setPickerOpen(true)} className="gap-1 text-slate-600 border-slate-300">
                <Icon name="Search" size={14} /> Подобрать материал
              </Button>
            </div>

            {matRows.map((row, idx) => (
              <div key={idx} className="mb-2 flex items-end gap-2">
                <div className="flex-1">
                  <label className="mb-1 block text-xs text-slate-500">Материал</label>
                  <div className="flex h-9 items-center rounded-md border border-slate-200 bg-slate-50 px-2 text-sm text-slate-700">
                    {row.material_name || `#${row.material_id}`}
                  </div>
                </div>
                <div className="w-28">
                  <label className="mb-1 block text-xs text-slate-500">Норма {row.unit_short ? `(${row.unit_short})` : ""}</label>
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
            {matRows.length === 0 && <p className="text-xs text-slate-400">Материалы не подобраны</p>}
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

          {/* --- Секция: Состав (вложенные полуфабрикаты) --- */}
          <div className="mt-4 border-t border-slate-200 pt-4">
            <div className="mb-1 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700">Состав (полуфабрикаты)</h3>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCompPickerOpen((v) => !v)}
                disabled={!form.group_id}
                className="gap-1 text-slate-600 border-slate-300"
              >
                <Icon name="Plus" size={14} /> Добавить полуфабрикат
              </Button>
            </div>
            <p className="mb-2 text-xs text-slate-400">
              {form.group_id
                ? "Из этой же группы. При изготовлении в заказ-наряде составляющие должны быть в наличии."
                : "Сначала выберите группу — компоненты берутся из неё."}
            </p>

            {compPickerOpen && form.group_id && (
              <div className="mb-2 rounded-md border border-slate-200 bg-slate-50 p-2">
                <input
                  value={compQuery}
                  onChange={(e) => setCompQuery(e.target.value)}
                  placeholder="Поиск полуфабриката в группе..."
                  className="mb-1 h-8 w-full rounded border border-slate-300 bg-white px-2 text-sm outline-none"
                />
                <div className="max-h-40 overflow-y-auto">
                  {componentCandidates.map((sp) => (
                    <button
                      key={sp.id}
                      type="button"
                      onClick={() => addComponent(sp)}
                      className="flex w-full items-center justify-between gap-2 rounded px-2 py-1 text-left text-sm hover:bg-white"
                    >
                      <span className="truncate text-slate-700">
                        {sp.name}
                        <span className="ml-1 text-xs text-slate-400">
                          {PF_TYPE_LABELS[(sp.pf_type ?? "material") as PfType]}
                        </span>
                      </span>
                      {sp.sku && <span className="flex-shrink-0 font-mono text-xs text-slate-400">{sp.sku}</span>}
                    </button>
                  ))}
                  {componentCandidates.length === 0 && (
                    <div className="px-2 py-3 text-center text-xs text-slate-400">
                      Нет доступных полуфабрикатов в группе
                    </div>
                  )}
                </div>
              </div>
            )}

            {compRows.map((row, idx) => (
              <div key={idx} className="mb-2 flex items-end gap-2">
                <div className="flex-1">
                  <label className="mb-1 block text-xs text-slate-500">Полуфабрикат</label>
                  <div className="flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2 text-sm text-slate-700">
                    <Icon name="Layers" size={13} className="text-emerald-500" />
                    <span className="truncate">{row.component_name || `#${row.component_id}`}</span>
                  </div>
                </div>
                <div className="w-28">
                  <label className="mb-1 block text-xs text-slate-500">Кол-во</label>
                  <Input
                    className="h-9 bg-white text-slate-800 border-slate-300"
                    type="number"
                    step="0.001"
                    min={0.001}
                    value={row.qty ?? 1}
                    onChange={(e) => updateComp(idx, { qty: Number(e.target.value) })}
                  />
                </div>
                <Button size="sm" variant="ghost" onClick={() => removeComp(idx)}>
                  <Icon name="X" size={14} className="text-red-500" />
                </Button>
              </div>
            ))}
            {compRows.length === 0 && <p className="text-xs text-slate-400">Полуфабрикаты не добавлены</p>}
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setOpen(false)} className="text-slate-600 border-slate-300">Отмена</Button>
            <Button onClick={() => save.mutate(form)} disabled={save.isPending} className="bg-blue-600 hover:bg-blue-700 text-white">
              {save.isPending ? "Сохранение..." : "Сохранить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <MaterialPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={addPickedMaterial}
      />

      <SemiGroupWizard open={wizardOpen} onClose={() => setWizardOpen(false)} />
    </div>
  );
}