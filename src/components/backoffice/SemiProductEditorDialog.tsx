import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  boFetch,
  SemiProduct,
  SemiProductMaterial,
  SemiProductOperation,
  SemiProductComponent,
  Operation,
  Group,
  StockMaterial,
  PfType,
  PF_TYPE_LABELS,
} from "@/pages/backoffice/types";
import MaterialPicker from "@/components/backoffice/MaterialPicker";
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

const EMPTY_SP: Partial<SemiProduct> = {
  name: "", sku: "", description: "", is_active: true, pf_type: "material", materials: [], operations: [], group_id: null,
};
const EMPTY_OP: Partial<SemiProductOperation> = { operation_id: 0, labor_cost: 0, sort_order: 0, notes: "" };

interface SemiProductEditorDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  semiProductId?: number | null;
  defaultName?: string;
  onSaved: (sp: SemiProduct) => void;
}

export default function SemiProductEditorDialog({
  open,
  onOpenChange,
  semiProductId,
  defaultName,
  onSaved,
}: SemiProductEditorDialogProps) {
  const qc = useQueryClient();
  const [form, setForm] = useState<Partial<SemiProduct>>(EMPTY_SP);
  const [matRows, setMatRows] = useState<Partial<SemiProductMaterial>[]>([]);
  const [opRows, setOpRows] = useState<Partial<SemiProductOperation>[]>([]);
  const [compRows, setCompRows] = useState<Partial<SemiProductComponent>[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [compPickerOpen, setCompPickerOpen] = useState(false);
  const [compQuery, setCompQuery] = useState("");

  const { data: items = [] } = useQuery<SemiProduct[]>({
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

  useEffect(() => {
    if (!open) return;
    setPickerOpen(false);
    setCompPickerOpen(false);
    setCompQuery("");
    if (semiProductId) {
      const sp = items.find((s) => s.id === semiProductId);
      if (sp) {
        setForm({
          id: sp.id, name: sp.name, sku: sp.sku, description: sp.description,
          is_active: sp.is_active, group_id: sp.group_id ?? null,
          pf_type: sp.pf_type ?? "material", size_label: sp.size_label,
        });
        setMatRows(sp.materials?.map((m) => ({ ...m })) ?? []);
        setOpRows(sp.operations?.map((o) => ({ ...o })) ?? []);
        setCompRows(sp.components?.map((c) => ({ ...c })) ?? []);
      }
    } else {
      setForm({ ...EMPTY_SP, name: defaultName ?? "" });
      setMatRows([]);
      setOpRows([]);
      setCompRows([]);
    }
  }, [open, semiProductId, items, defaultName]);

  const save = useMutation({
    mutationFn: (data: Partial<SemiProduct>): Promise<SemiProduct> =>
      boFetch("semi_products", data.id ? "PUT" : "POST", {
        ...data,
        materials: matRows,
        operations: opRows,
        components: compRows,
      }),
    onSuccess: (sp) => {
      qc.invalidateQueries({ queryKey: ["bo-semi-products"] });
      toast({ title: "Сохранено" });
      onSaved(sp);
      onOpenChange(false);
    },
    onError: (e: Error) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  const addPickedMaterial = (m: StockMaterial, norm: number) => {
    setMatRows((prev) => [
      ...prev,
      { material_id: m.id, norm_qty: norm, notes: "", material_name: m.name, unit_short: m.unit_short },
    ]);
  };

  const updateMat = (idx: number, patch: Partial<SemiProductMaterial>) =>
    setMatRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  const removeMat = (idx: number) => setMatRows((prev) => prev.filter((_, i) => i !== idx));

  const updateOp = (idx: number, patch: Partial<SemiProductOperation>) =>
    setOpRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  const removeOp = (idx: number) => setOpRows((prev) => prev.filter((_, i) => i !== idx));

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

  const componentCandidates = items.filter((sp) => {
    if (form.id && sp.id === form.id) return false;
    if (form.group_id && sp.group_id !== form.group_id) return false;
    if (compRows.some((c) => c.component_id === sp.id)) return false;
    const q = compQuery.trim().toLowerCase();
    if (q && !sp.name.toLowerCase().includes(q) && !(sp.sku || "").toLowerCase().includes(q)) return false;
    return true;
  });

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl bg-white text-slate-800 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "Редактирование полуфабриката" : "Новый полуфабрикат"}</DialogTitle>
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
                  <option value="composite">Составной</option>
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
            <Button variant="outline" onClick={() => onOpenChange(false)} className="text-slate-600 border-slate-300">Отмена</Button>
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
    </>
  );
}
