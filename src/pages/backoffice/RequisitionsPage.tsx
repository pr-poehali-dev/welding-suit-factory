import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  boFetch,
  Requisition,
  RequisitionItem,
  Warehouse,
  Worker,
  Material,
  WorkOrder,
  WorkerBalance,
  StockItem,
} from "@/pages/backoffice/types";
import { printRequisition } from "@/pages/backoffice/printTemplates";
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

const qtyFmt = (v: number) => Number(v || 0).toLocaleString("ru", { maximumFractionDigits: 4 });

interface NewItem {
  material_id: number;
  issued_qty: string;
  norm_qty: string;
}

export default function RequisitionsPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"list" | "balances">("list");
  const [issueOpen, setIssueOpen] = useState(false);
  const [returnItem, setReturnItem] = useState<RequisitionItem | null>(null);
  const [returnQty, setReturnQty] = useState("");

  // форма выдачи
  const [warehouseId, setWarehouseId] = useState<number>(0);
  const [workerId, setWorkerId] = useState<number>(0);
  const [workOrderId, setWorkOrderId] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [rows, setRows] = useState<NewItem[]>([{ material_id: 0, issued_qty: "", norm_qty: "" }]);

  const { data: requisitions = [], isLoading } = useQuery<Requisition[]>({
    queryKey: ["bo-requisitions"],
    queryFn: () => boFetch("requisitions"),
  });
  const { data: balances = [] } = useQuery<WorkerBalance[]>({
    queryKey: ["bo-worker-balances"],
    queryFn: () => boFetch("worker_balances"),
  });
  const { data: warehouses = [] } = useQuery<Warehouse[]>({
    queryKey: ["bo-warehouses"],
    queryFn: () => boFetch("warehouses"),
  });
  const { data: workers = [] } = useQuery<Worker[]>({
    queryKey: ["bo-workers"],
    queryFn: () => boFetch("workers"),
  });
  const { data: materials = [] } = useQuery<Material[]>({
    queryKey: ["bo-materials"],
    queryFn: () => boFetch("materials"),
  });
  const { data: workOrders = [] } = useQuery<WorkOrder[]>({
    queryKey: ["bo-work-orders"],
    queryFn: () => boFetch("work_orders"),
  });
  const { data: stock = [] } = useQuery<StockItem[]>({
    queryKey: ["bo-stock"],
    queryFn: () => boFetch("stock"),
  });

  // доступный остаток материала на выбранном складе (qty − reserved_qty)
  const availableQty = (materialId: number): number | null => {
    if (!warehouseId || !materialId) return null;
    return stock
      .filter((s) => s.warehouse_id === warehouseId && s.item_type === "material" && s.item_id === materialId)
      .reduce((a, s) => a + (Number(s.qty) - Number(s.reserved_qty)), 0);
  };

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["bo-requisitions"] });
    qc.invalidateQueries({ queryKey: ["bo-worker-balances"] });
    qc.invalidateQueries({ queryKey: ["bo-stock"] });
  };

  const issueMut = useMutation({
    mutationFn: () =>
      boFetch("requisitions", "POST", {
        warehouse_id: warehouseId,
        worker_id: workerId,
        work_order_id: workOrderId ? Number(workOrderId) : null,
        notes: notes.trim() || null,
        items: rows
          .filter((r) => r.material_id && Number(r.issued_qty) > 0)
          .map((r) => ({
            material_id: r.material_id,
            issued_qty: Number(r.issued_qty),
            norm_qty: r.norm_qty ? Number(r.norm_qty) : null,
          })),
      }),
    onSuccess: () => {
      refresh();
      toast({ title: "Материал выдан" });
      setIssueOpen(false);
      resetForm();
    },
    onError: (e: Error) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  const returnMut = useMutation({
    mutationFn: () =>
      boFetch("requisition_return", "POST", {
        item_id: returnItem?.id,
        return_qty: Number(returnQty),
      }),
    onSuccess: () => {
      refresh();
      toast({ title: "Возврат оформлен" });
      setReturnItem(null);
      setReturnQty("");
    },
    onError: (e: Error) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  const closeMut = useMutation({
    mutationFn: (id: number) => boFetch("requisition_close", "POST", { id }),
    onSuccess: () => {
      refresh();
      toast({ title: "Требование закрыто" });
    },
    onError: (e: Error) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  const resetForm = () => {
    setWarehouseId(warehouses[0]?.id ?? 0);
    setWorkerId(0);
    setWorkOrderId("");
    setNotes("");
    setRows([{ material_id: 0, issued_qty: "", norm_qty: "" }]);
  };

  const openIssue = () => {
    resetForm();
    setIssueOpen(true);
  };

  const setRow = (i: number, patch: Partial<NewItem>) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const addRow = () => setRows((prev) => [...prev, { material_id: 0, issued_qty: "", norm_qty: "" }]);
  const delRow = (i: number) => setRows((prev) => prev.filter((_, idx) => idx !== i));

  // автоподстановка материалов и норм из выбранного заказ-наряда
  const onSelectWorkOrder = (value: string) => {
    setWorkOrderId(value);
    if (!value) return;
    const wo = workOrders.find((w) => String(w.id) === value);
    if (!wo) return;

    // склад из наряда
    if (wo.warehouse_id) setWarehouseId(wo.warehouse_id);

    // собираем материалы из операций наряда: норма × количество наряда
    const woQty = Number(wo.qty) || 1;
    const map = new Map<number, number>();
    (wo.operations ?? []).forEach((op) => {
      if (op.material_id && op.planned_material_norm != null) {
        const total = Number(op.planned_material_norm) * woQty;
        map.set(op.material_id, (map.get(op.material_id) || 0) + total);
      }
    });

    if (map.size === 0) {
      toast({ title: "В заказ-наряде нет норм материалов", description: "Заполните позиции вручную" });
      return;
    }

    const filled: NewItem[] = Array.from(map.entries()).map(([material_id, norm]) => ({
      material_id,
      issued_qty: String(norm),
      norm_qty: String(norm),
    }));
    setRows(filled);
    toast({ title: "Позиции заполнены из заказ-наряда" });
  };

  const hasShortage = rows.some((r) => {
    if (!r.material_id || !(Number(r.issued_qty) > 0)) return false;
    const avail = availableQty(r.material_id);
    return avail != null && Number(r.issued_qty) > avail;
  });

  const canIssue =
    warehouseId > 0 && workerId > 0 && !hasShortage &&
    rows.some((r) => r.material_id && Number(r.issued_qty) > 0);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-800">Требования-накладные</h1>
        <Button onClick={openIssue} className="gap-1.5 bg-blue-600 text-white hover:bg-blue-700">
          <Icon name="Plus" size={16} /> Выдать материал
        </Button>
      </div>

      <div className="mb-4 flex gap-1 rounded-lg bg-slate-100 p-1">
        <button
          onClick={() => setTab("list")}
          className={`rounded-md px-3 py-1.5 text-sm font-medium ${tab === "list" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"}`}
        >
          Накладные
        </button>
        <button
          onClick={() => setTab("balances")}
          className={`rounded-md px-3 py-1.5 text-sm font-medium ${tab === "balances" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"}`}
        >
          Материал на руках
        </button>
      </div>

      {tab === "list" ? (
        isLoading ? (
          <div className="flex items-center gap-2 text-slate-400"><Icon name="Loader2" size={20} className="animate-spin" /> Загрузка...</div>
        ) : (
          <div className="space-y-3">
            {requisitions.map((req) => (
              <div key={req.id} className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="font-semibold text-slate-800">{req.doc_number}</span>
                    <span className="ml-2 text-sm text-slate-500">
                      {req.worker_name} · {req.warehouse_name}
                      {req.work_order_number ? ` · ЗН ${req.work_order_number}` : ""}
                    </span>
                    <span className={`ml-2 rounded px-2 py-0.5 text-xs ${req.status === "closed" ? "bg-slate-100 text-slate-500" : "bg-green-100 text-green-700"}`}>
                      {req.status === "closed" ? "Закрыто" : "Выдано"}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" onClick={() => printRequisition(req)} className="gap-1 border-slate-300 text-slate-600">
                      <Icon name="Printer" size={14} /> Печать
                    </Button>
                    {req.status !== "closed" && (
                      <Button size="sm" variant="outline" onClick={() => closeMut.mutate(req.id)} className="gap-1 border-slate-300 text-slate-600">
                        <Icon name="Lock" size={14} /> Закрыть
                      </Button>
                    )}
                  </div>
                </div>
                <div className="overflow-x-auto rounded border border-slate-100">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                        <th className="px-3 py-2">Материал</th>
                        <th className="px-3 py-2 text-right">Норма</th>
                        <th className="px-3 py-2 text-right">Выдано</th>
                        <th className="px-3 py-2 text-right">Возвращено</th>
                        <th className="px-3 py-2 text-right">На руках</th>
                        <th className="px-3 py-2 text-right">Действие</th>
                      </tr>
                    </thead>
                    <tbody>
                      {req.items.map((it) => {
                        const remaining = Number(it.issued_qty) - Number(it.returned_qty);
                        return (
                          <tr key={it.id} className="border-t border-slate-100">
                            <td className="px-3 py-2 text-slate-700">{it.material_name} <span className="text-slate-400">{it.unit_short}</span></td>
                            <td className="px-3 py-2 text-right text-slate-500">{it.norm_qty != null ? qtyFmt(it.norm_qty) : "—"}</td>
                            <td className="px-3 py-2 text-right text-slate-700">{qtyFmt(it.issued_qty)}</td>
                            <td className="px-3 py-2 text-right text-slate-500">{qtyFmt(it.returned_qty)}</td>
                            <td className="px-3 py-2 text-right font-medium text-slate-700">{qtyFmt(remaining)}</td>
                            <td className="px-3 py-2 text-right">
                              {remaining > 0 && (
                                <Button size="sm" variant="ghost" onClick={() => { setReturnItem(it); setReturnQty(String(remaining)); }} className="gap-1 text-blue-600">
                                  <Icon name="Undo2" size={14} /> Возврат
                                </Button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
            {requisitions.length === 0 && (
              <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-slate-400">Нет требований-накладных</div>
            )}
          </div>
        )
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase text-slate-500">
                <th className="px-4 py-3">Рабочий</th>
                <th className="px-4 py-3">Материал</th>
                <th className="px-4 py-3 text-right">На руках</th>
              </tr>
            </thead>
            <tbody>
              {balances.map((b, i) => (
                <tr key={b.id} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                  <td className="px-4 py-2.5 font-medium text-slate-700">{b.worker_name}</td>
                  <td className="px-4 py-2.5 text-slate-600">{b.material_name}</td>
                  <td className="px-4 py-2.5 text-right font-medium text-slate-700">{qtyFmt(b.qty)} {b.unit_short}</td>
                </tr>
              ))}
              {balances.length === 0 && (
                <tr><td colSpan={3} className="px-4 py-8 text-center text-slate-400">Нет материалов на руках</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ===== Диалог выдачи ===== */}
      <Dialog open={issueOpen} onOpenChange={setIssueOpen}>
        <DialogContent className="max-w-2xl bg-white text-slate-800 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Выдача материала</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-slate-500">Склад</label>
                <select value={warehouseId} onChange={(e) => setWarehouseId(Number(e.target.value))} className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm">
                  <option value={0}>-- выберите --</option>
                  {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-500">Рабочий (получатель)</label>
                <select value={workerId} onChange={(e) => setWorkerId(Number(e.target.value))} className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm">
                  <option value={0}>-- выберите --</option>
                  {workers.filter((w) => w.is_active).map((w) => <option key={w.id} value={w.id}>{w.full_name}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Заказ-наряд (автозаполнение материалов и норм)</label>
              <select value={workOrderId} onChange={(e) => onSelectWorkOrder(e.target.value)} className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm">
                <option value="">— без привязки —</option>
                {workOrders.map((wo) => (
                  <option key={wo.id} value={wo.id}>{wo.work_order_number} {wo.order_number ? `(${wo.order_number})` : ""}</option>
                ))}
              </select>
              {workOrderId && (
                <p className="mt-1 text-[11px] text-slate-400">Позиции подставлены из заказ-наряда — можно скорректировать вручную.</p>
              )}
            </div>

            <div className="rounded-lg border border-slate-200 p-2">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-600">Позиции</span>
                <Button size="sm" variant="outline" onClick={addRow} className="h-7 gap-1 border-slate-300 text-slate-600">
                  <Icon name="Plus" size={13} /> Строка
                </Button>
              </div>
              {rows.map((r, i) => {
                const avail = availableQty(r.material_id);
                const short = avail != null && Number(r.issued_qty) > avail;
                return (
                  <div key={i} className="mb-2">
                    <div className="grid grid-cols-[1fr_90px_90px_32px] items-end gap-2">
                      <div>
                        <label className="mb-0.5 block text-[11px] text-slate-400">Материал</label>
                        <select value={r.material_id} onChange={(e) => setRow(i, { material_id: Number(e.target.value) })} className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm">
                          <option value={0}>--</option>
                          {materials.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="mb-0.5 block text-[11px] text-slate-400">Выдать</label>
                        <Input type="number" step="0.001" value={r.issued_qty} onChange={(e) => setRow(i, { issued_qty: e.target.value })} className={`h-9 bg-white ${short ? "border-red-400" : "border-slate-300"}`} />
                      </div>
                      <div>
                        <label className="mb-0.5 block text-[11px] text-slate-400">Норма</label>
                        <Input type="number" step="0.001" value={r.norm_qty} onChange={(e) => setRow(i, { norm_qty: e.target.value })} className="h-9 border-slate-300 bg-white" />
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => delRow(i)} disabled={rows.length === 1} className="h-9">
                        <Icon name="Trash2" size={15} className="text-red-500" />
                      </Button>
                    </div>
                    {r.material_id > 0 && (
                      avail == null ? (
                        <p className="mt-0.5 text-[11px] text-slate-400">Выберите склад, чтобы увидеть остаток</p>
                      ) : short ? (
                        <p className="mt-0.5 text-[11px] font-medium text-red-500">
                          На складе доступно только {avail.toLocaleString("ru", { maximumFractionDigits: 4 })} — недостаточно
                        </p>
                      ) : (
                        <p className="mt-0.5 text-[11px] text-slate-400">
                          Доступно на складе: {avail.toLocaleString("ru", { maximumFractionDigits: 4 })}
                        </p>
                      )
                    )}
                  </div>
                );
              })}
            </div>

            <div>
              <label className="mb-1 block text-xs text-slate-500">Примечание</label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} className="h-9 border-slate-300 bg-white" />
            </div>
          </div>
          <DialogFooter className="flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-end">
            {hasShortage && (
              <span className="text-xs font-medium text-red-500 sm:mr-auto">
                Недостаточно материала на складе — исправьте количество
              </span>
            )}
            <Button variant="outline" onClick={() => setIssueOpen(false)} className="border-slate-300 text-slate-600">Отмена</Button>
            <Button onClick={() => issueMut.mutate()} disabled={!canIssue || issueMut.isPending} className="bg-blue-600 text-white hover:bg-blue-700">
              {issueMut.isPending ? "Выдача..." : "Выдать"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Диалог возврата ===== */}
      <Dialog open={!!returnItem} onOpenChange={() => setReturnItem(null)}>
        <DialogContent className="max-w-sm bg-white text-slate-800">
          <DialogHeader>
            <DialogTitle>Возврат: {returnItem?.material_name}</DialogTitle>
          </DialogHeader>
          <div>
            <label className="mb-1 block text-sm text-slate-600">Количество возврата</label>
            <Input type="number" step="0.001" min={0} value={returnQty} onChange={(e) => setReturnQty(e.target.value)} className="border-slate-300 bg-white" />
            {returnItem && (
              <p className="mt-1 text-xs text-slate-400">
                На руках: {qtyFmt(Number(returnItem.issued_qty) - Number(returnItem.returned_qty))} {returnItem.unit_short}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReturnItem(null)} className="border-slate-300 text-slate-600">Отмена</Button>
            <Button onClick={() => returnMut.mutate()} disabled={returnMut.isPending || !Number(returnQty)} className="bg-blue-600 text-white hover:bg-blue-700">
              {returnMut.isPending ? "Возврат..." : "Вернуть на склад"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}