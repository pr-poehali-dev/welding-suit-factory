import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  boFetch,
  Material,
  Unit,
  Group,
  Warehouse,
  Supplier,
  VatRate,
} from "@/pages/backoffice/types";
import { useAuth } from "@/context/AuthContext";
import Icon from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface Props {
  open: boolean;
  onClose: () => void;
  defaultGroupId?: number | null;
}

type Mode = "new" | "existing";

export default function MaterialReceiptWizard({ open, onClose, defaultGroupId }: Props) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const canSeeSupplier =
    user?.access_level === "director" || user?.access_level === "storekeeper";

  const [mode, setMode] = useState<Mode>("new");
  const [materialId, setMaterialId] = useState<number | null>(null);
  const [matQuery, setMatQuery] = useState("");

  // поля нового материала
  const [name, setName] = useState("");
  const [unitId, setUnitId] = useState<number>(0);
  const [groupId, setGroupId] = useState<number | null>(null);
  const [color, setColor] = useState("");
  const [density, setDensity] = useState("");
  const [supplierId, setSupplierId] = useState<number | null>(null);
  const [vatRateId, setVatRateId] = useState<number | null>(null);
  const [hasVat, setHasVat] = useState(true);

  // поступление
  const [warehouseId, setWarehouseId] = useState<number | null>(null);
  const [qty, setQty] = useState("");
  const [amount, setAmount] = useState("");

  const { data: materials = [] } = useQuery<Material[]>({
    queryKey: ["bo-materials"],
    queryFn: () => boFetch("materials"),
    enabled: open,
  });
  const { data: units = [] } = useQuery<Unit[]>({
    queryKey: ["bo-units"],
    queryFn: () => boFetch("units"),
    enabled: open,
  });
  const { data: groups = [] } = useQuery<Group[]>({
    queryKey: ["bo-groups", "materials"],
    queryFn: () => boFetch("groups", "GET", undefined, { entity_type: "materials" }),
    enabled: open,
  });
  const { data: warehouses = [] } = useQuery<Warehouse[]>({
    queryKey: ["bo-warehouses"],
    queryFn: () => boFetch("warehouses"),
    enabled: open,
  });
  const { data: suppliers = [] } = useQuery<Supplier[]>({
    queryKey: ["bo-suppliers"],
    queryFn: () => boFetch("suppliers"),
    enabled: open && canSeeSupplier,
  });
  const { data: vatRates = [] } = useQuery<VatRate[]>({
    queryKey: ["bo-vat-rates"],
    queryFn: () => boFetch("vat_rates"),
    enabled: open,
  });

  useEffect(() => {
    if (open) {
      setWarehouseId((w) => w ?? warehouses[0]?.id ?? null);
    }
  }, [open, warehouses]);

  useEffect(() => {
    if (open && unitId === 0 && units.length) setUnitId(units[0].id);
  }, [open, units, unitId]);

  const qtyN = Number(qty) || 0;
  const amountN = Number(amount) || 0;
  const unitPrice = qtyN > 0 ? amountN / qtyN : 0;

  // расчёт НДС в сумме
  const activeVat = vatRates.find((v) => v.id === vatRateId);
  const vatInfo = useMemo(() => {
    if (!hasVat || !activeVat || activeVat.is_no_vat || activeVat.rate === 0) return null;
    const rate = Number(activeVat.rate);
    const net = amountN / (1 + rate / 100);
    const vat = amountN - net;
    return { net, vat, rate };
  }, [hasVat, activeVat, amountN]);

  const filteredMaterials = useMemo(() => {
    const q = matQuery.trim().toLowerCase();
    if (!q) return materials.slice(0, 40);
    return materials
      .filter((m) => m.name.toLowerCase().includes(q) || (m.sku || "").toLowerCase().includes(q))
      .slice(0, 40);
  }, [materials, matQuery]);

  const create = useMutation({
    mutationFn: () => {
      const payload: Record<string, unknown> = {
        warehouse_id: warehouseId,
        qty: qtyN,
        amount: amountN,
      };
      if (mode === "existing") {
        payload.material_id = materialId;
      } else {
        payload.name = name.trim();
        payload.unit_id = unitId;
        payload.group_id = groupId;
        payload.color = color.trim() || null;
        payload.density = density.trim() || null;
        payload.vat_rate_id = hasVat ? vatRateId : null;
        if (canSeeSupplier) payload.supplier_id = supplierId;
      }
      return boFetch("material_receipt", "POST", payload);
    },
    onSuccess: (res: { name: string; unit_price: number; qty: number }) => {
      qc.invalidateQueries({ queryKey: ["bo-materials"] });
      qc.invalidateQueries({ queryKey: ["bo-stock"] });
      toast({
        title: "Поступление оформлено",
        description: `${res.name}: ${res.qty} по цене захода ${res.unit_price.toLocaleString("ru")} r.`,
      });
      handleClose();
    },
    onError: (e: Error) =>
      toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  const handleClose = () => {
    setMode("new");
    setMaterialId(null);
    setMatQuery("");
    setName("");
    setColor("");
    setDensity("");
    setSupplierId(null);
    setVatRateId(null);
    setHasVat(true);
    setQty("");
    setAmount("");
    setGroupId(null);
    onClose();
  };

  useEffect(() => {
    if (open) setGroupId((g) => g ?? defaultGroupId ?? null);
  }, [open, defaultGroupId]);

  const canSubmit =
    !!warehouseId &&
    qtyN > 0 &&
    amountN >= 0 &&
    (mode === "existing" ? !!materialId : !!name.trim() && !!unitId);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-2xl bg-white text-slate-800 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Поступление материала</DialogTitle>
        </DialogHeader>

        {/* Режим */}
        <div className="flex gap-2 rounded-lg bg-slate-100 p-1 text-sm">
          <button
            type="button"
            onClick={() => setMode("new")}
            className={`flex-1 rounded-md py-1.5 ${mode === "new" ? "bg-white font-medium text-slate-800 shadow" : "text-slate-500"}`}
          >
            Новый материал
          </button>
          <button
            type="button"
            onClick={() => setMode("existing")}
            className={`flex-1 rounded-md py-1.5 ${mode === "existing" ? "bg-white font-medium text-slate-800 shadow" : "text-slate-500"}`}
          >
            Существующий (цена + кол-во)
          </button>
        </div>

        {mode === "existing" ? (
          <div className="rounded-lg border border-slate-200 p-3">
            <label className="mb-1 block text-xs text-slate-500">Материал</label>
            <div className="mb-2 flex items-center gap-2 rounded-md border border-slate-300 px-2">
              <Icon name="Search" size={16} className="text-slate-400" />
              <input
                value={matQuery}
                onChange={(e) => setMatQuery(e.target.value)}
                placeholder="Поиск материала..."
                className="h-9 w-full bg-transparent text-sm outline-none"
              />
            </div>
            <div className="max-h-44 overflow-y-auto rounded-md border border-slate-100">
              {filteredMaterials.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMaterialId(m.id)}
                  className={`flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-sm ${
                    materialId === m.id ? "bg-blue-50 text-blue-700" : "hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  <span className="truncate">{m.name}</span>
                  <span className="flex-shrink-0 text-xs text-slate-400">
                    остаток: {Number(m.stock_qty || 0).toLocaleString("ru")} {m.unit_short}
                  </span>
                </button>
              ))}
              {filteredMaterials.length === 0 && (
                <div className="px-3 py-4 text-center text-sm text-slate-400">Ничего не найдено</div>
              )}
            </div>
          </div>
        ) : (
          <div className="grid gap-3 rounded-lg border border-slate-200 p-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-slate-500">Название</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} className="h-9 border-slate-300 bg-white text-slate-800" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-500">Единица измерения</label>
                <select
                  value={unitId}
                  onChange={(e) => setUnitId(Number(e.target.value))}
                  className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-800"
                >
                  <option value={0}>-- выберите --</option>
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>{u.name} ({u.short_name})</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-slate-500">Группа</label>
                <select
                  value={groupId ?? ""}
                  onChange={(e) => setGroupId(e.target.value ? Number(e.target.value) : null)}
                  className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-800"
                >
                  <option value="">— без группы —</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-500">Цвет</label>
                <Input value={color} onChange={(e) => setColor(e.target.value)} className="h-9 border-slate-300 bg-white text-slate-800" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-slate-500">Плотность / толщина</label>
                <Input value={density} onChange={(e) => setDensity(e.target.value)} className="h-9 border-slate-300 bg-white text-slate-800" />
              </div>
              {canSeeSupplier && (
                <div>
                  <label className="mb-1 block text-xs text-slate-500">Поставщик</label>
                  <select
                    value={supplierId ?? ""}
                    onChange={(e) => setSupplierId(e.target.value ? Number(e.target.value) : null)}
                    className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-800"
                  >
                    <option value="">— не указан —</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Поступление: склад, кол-во, сумма, НДС */}
        <div className="grid gap-3 rounded-lg border border-slate-200 p-3">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-xs text-slate-500">Склад</label>
              <select
                value={warehouseId ?? ""}
                onChange={(e) => setWarehouseId(e.target.value ? Number(e.target.value) : null)}
                className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-800"
              >
                <option value="">-- выберите --</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Количество</label>
              <Input type="number" step="0.001" min={0} value={qty} onChange={(e) => setQty(e.target.value)} className="h-9 border-slate-300 bg-white text-slate-800" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Сумма</label>
              <Input type="number" step="0.01" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} className="h-9 border-slate-300 bg-white text-slate-800" />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={hasVat} onChange={(e) => setHasVat(e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
              Сумма с НДС
            </label>
            {hasVat && (
              <select
                value={vatRateId ?? ""}
                onChange={(e) => setVatRateId(e.target.value ? Number(e.target.value) : null)}
                className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-800"
              >
                <option value="">Ставка НДС</option>
                {vatRates.map((v) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            )}
          </div>

          <div className="rounded-md bg-slate-50 p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Цена захода (сумма ÷ кол-во):</span>
              <span className="font-semibold text-slate-800">{unitPrice.toLocaleString("ru", { maximumFractionDigits: 2 })} r.</span>
            </div>
            {vatInfo && (
              <div className="mt-1 space-y-0.5 text-xs text-slate-500">
                <div className="flex justify-between">
                  <span>в т.ч. НДС ({vatInfo.rate}%):</span>
                  <span>{vatInfo.vat.toLocaleString("ru", { maximumFractionDigits: 2 })} r.</span>
                </div>
                <div className="flex justify-between">
                  <span>сумма без НДС:</span>
                  <span>{vatInfo.net.toLocaleString("ru", { maximumFractionDigits: 2 })} r.</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} className="border-slate-300 text-slate-600">Отмена</Button>
          <Button onClick={() => create.mutate()} disabled={!canSubmit || create.isPending} className="bg-blue-600 text-white hover:bg-blue-700">
            {create.isPending ? "Оформление..." : "Оформить поступление"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
