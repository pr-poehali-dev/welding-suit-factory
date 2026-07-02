import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  boFetch,
  Warehouse,
  StockItem,
  StockMovement,
  ITEM_TYPES,
} from "@/pages/backoffice/types";
import MaterialReceiptWizard from "@/components/backoffice/MaterialReceiptWizard";
import { useAuth } from "@/context/AuthContext";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const MOVEMENT_LABELS: Record<string, string> = {
  in: "Приход",
  out: "Расход",
  write_off: "Списание",
  return: "Возврат",
};

interface EditForm {
  id: number;
  qty: number;
  reason: string;
}

export default function StockPage() {
  const qc = useQueryClient();
  const { can } = useAuth();
  const canReceive = can("stock.edit");
  const [activeWarehouse, setActiveWarehouse] = useState<number>(0);
  const [activeType, setActiveType] = useState("material");
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [historyItem, setHistoryItem] = useState<StockItem | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);

  /* --- данные --- */
  const { data: warehouses = [] } = useQuery<Warehouse[]>({
    queryKey: ["bo-warehouses"],
    queryFn: () => boFetch("warehouses"),
  });

  const { data: stock = [], isLoading } = useQuery<StockItem[]>({
    queryKey: ["bo-stock"],
    queryFn: () => boFetch("stock"),
  });

  /* --- история движений по выбранной позиции --- */
  const historyKey = historyItem
    ? [
        "bo-stock-movements",
        historyItem.warehouse_id,
        historyItem.item_type,
        historyItem.item_id,
      ]
    : ["bo-stock-movements"];

  const { data: movements = [], isLoading: histLoading } = useQuery<
    StockMovement[]
  >({
    queryKey: historyKey,
    queryFn: () =>
      boFetch("stock_movements", "GET", undefined, {
        warehouse_id: String(historyItem!.warehouse_id),
        item_type: historyItem!.item_type,
        item_id: String(historyItem!.item_id),
      }),
    enabled: !!historyItem,
  });

  /* --- мутация: редактирование движения --- */
  const editMut = useMutation({
    mutationFn: (data: EditForm) =>
      boFetch("stock_movement_edit", "PUT", {
        id: data.id,
        qty: data.qty,
        reason: data.reason,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bo-stock"] });
      qc.invalidateQueries({ queryKey: historyKey });
      toast({ title: "Движение обновлено" });
      setEditForm(null);
    },
    onError: (e: Error) =>
      toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  /* --- мутация: снимок остатков --- */
  const snapshotMut = useMutation<{ already?: boolean }, Error>({
    mutationFn: () => boFetch("stock_snapshot", "POST", {}),
    onSuccess: (res) => {
      toast({
        title: res.already ? "Снимок за сегодня уже есть" : "Снимок сохранён",
      });
    },
    onError: (e: Error) =>
      toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  /* --- выбираем первый склад если не выбран --- */
  const whId = activeWarehouse || (warehouses.length > 0 ? warehouses[0].id : 0);

  /* --- фильтрация --- */
  const filtered = stock.filter(
    (s) => s.warehouse_id === whId && s.item_type === activeType,
  );

  const openHistory = (item: StockItem) => {
    setEditForm(null);
    setHistoryItem(item);
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Склад</h1>
        {canReceive && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => snapshotMut.mutate()}
              disabled={snapshotMut.isPending}
              className="gap-1.5 text-slate-700 border-slate-300 hover:bg-slate-50"
            >
              <Icon name="Camera" size={16} /> Снимок остатков
            </Button>
            <Button
              onClick={() => setReceiptOpen(true)}
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Icon name="PackagePlus" size={16} /> Поступление материала
            </Button>
          </div>
        )}
      </div>

      {/* --- Вкладки складов --- */}
      <div className="mb-3 flex flex-wrap gap-2">
        {warehouses.map((w) => (
          <button
            key={w.id}
            onClick={() => setActiveWarehouse(w.id)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              whId === w.id
                ? "bg-blue-600 text-white"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            {w.name} ({w.city})
          </button>
        ))}
        {warehouses.length === 0 && (
          <span className="text-sm text-slate-400">Загрузка складов...</span>
        )}
      </div>

      {/* --- Под-вкладки типов --- */}
      <div className="mb-4 flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1">
        {ITEM_TYPES.map((t) => (
          <button
            key={t.value}
            onClick={() => setActiveType(t.value)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              activeType === t.value
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* --- Таблица --- */}
      {isLoading ? (
        <div className="flex items-center gap-2 text-slate-400">
          <Icon name="Loader2" size={20} className="animate-spin" /> Загрузка...
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">Наименование</th>
                <th className="px-4 py-3 text-right">Кол-во</th>
                <th className="px-4 py-3 text-right">Зарезервировано</th>
                <th className="px-4 py-3 text-right">Доступно</th>
                <th className="px-4 py-3 text-right">Действия</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, i) => {
                const avail = Number(s.qty) - Number(s.reserved_qty);
                return (
                  <tr key={s.id} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                    <td className="px-4 py-2.5 font-medium text-slate-700">{s.item_name ?? `#${s.item_id}`}</td>
                    <td className="px-4 py-2.5 text-right text-slate-600">{Number(s.qty).toLocaleString("ru")}</td>
                    <td className="px-4 py-2.5 text-right text-slate-600">{Number(s.reserved_qty).toLocaleString("ru")}</td>
                    <td className={`px-4 py-2.5 text-right font-medium ${avail < 0 ? "text-red-600" : "text-slate-700"}`}>
                      {avail.toLocaleString("ru")}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openHistory(s)}
                          className="gap-1 text-slate-700 border-slate-300 hover:bg-slate-50"
                        >
                          <Icon name="History" size={14} /> История
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">Нет позиций</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* --- Dialog: история движений --- */}
      <Dialog open={!!historyItem} onOpenChange={(o) => !o && setHistoryItem(null)}>
        <DialogContent className="max-w-2xl bg-white text-slate-800">
          <DialogHeader>
            <DialogTitle>
              История движений: {historyItem?.item_name ?? `#${historyItem?.item_id}`}
            </DialogTitle>
          </DialogHeader>

          {histLoading ? (
            <div className="flex items-center gap-2 text-slate-400">
              <Icon name="Loader2" size={20} className="animate-spin" /> Загрузка...
            </div>
          ) : (
            <div className="max-h-[60vh] overflow-y-auto rounded-lg border border-slate-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    <th className="px-3 py-2">Дата</th>
                    <th className="px-3 py-2">Тип</th>
                    <th className="px-3 py-2 text-right">Кол-во</th>
                    <th className="px-3 py-2">Причина</th>
                    <th className="px-3 py-2 text-right"></th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((m) => (
                    <tr key={m.id} className="border-b border-slate-100 last:border-0">
                      <td className="px-3 py-2 text-slate-600 whitespace-nowrap">
                        {new Date(m.created_at).toLocaleString("ru")}
                      </td>
                      <td className="px-3 py-2 text-slate-700">
                        {MOVEMENT_LABELS[m.movement_type] ?? m.movement_type}
                      </td>
                      <td className="px-3 py-2 text-right text-slate-600">
                        {Number(m.qty).toLocaleString("ru")}
                      </td>
                      <td className="px-3 py-2 text-slate-500">{m.reason || "—"}</td>
                      <td className="px-3 py-2 text-right">
                        {m.movement_type === "in" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setEditForm({
                                id: m.id,
                                qty: Number(m.qty),
                                reason: m.reason ?? "",
                              })
                            }
                            className="h-7 w-7 p-0 text-slate-600 border-slate-300 hover:bg-slate-50"
                          >
                            <Icon name="Pencil" size={14} />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {movements.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-3 py-6 text-center text-slate-400">
                        Нет движений
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {editForm && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="mb-2 text-sm font-medium text-slate-700">
                Редактировать поступление
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Количество</label>
                  <Input
                    className="bg-white text-slate-800 border-slate-300"
                    type="number"
                    min={0}
                    step="0.01"
                    value={editForm.qty}
                    onChange={(e) =>
                      setEditForm((p) => (p ? { ...p, qty: Number(e.target.value) } : p))
                    }
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Причина</label>
                  <Input
                    className="bg-white text-slate-800 border-slate-300"
                    value={editForm.reason}
                    onChange={(e) =>
                      setEditForm((p) => (p ? { ...p, reason: e.target.value } : p))
                    }
                  />
                </div>
              </div>
              <div className="mt-3 flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditForm(null)}
                  className="text-slate-600 border-slate-300"
                >
                  Отмена
                </Button>
                <Button
                  size="sm"
                  disabled={editMut.isPending || !editForm.qty}
                  onClick={() => editForm && editMut.mutate(editForm)}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {editMut.isPending ? "Сохранение..." : "Сохранить"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <MaterialReceiptWizard open={receiptOpen} onClose={() => setReceiptOpen(false)} />
    </div>
  );
}
