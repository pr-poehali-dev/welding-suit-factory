import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  boFetch,
  Warehouse,
  StockItem,
  ITEM_TYPES,
} from "@/pages/backoffice/types";
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

interface MovementForm {
  warehouse_id: number;
  item_type: string;
  item_id: number;
  item_name: string;
  movement_type: "in" | "out";
  qty: number;
  reason: string;
}

export default function StockPage() {
  const qc = useQueryClient();
  const [activeWarehouse, setActiveWarehouse] = useState<number>(0);
  const [activeType, setActiveType] = useState("material");
  const [moveOpen, setMoveOpen] = useState(false);
  const [moveForm, setMoveForm] = useState<MovementForm | null>(null);

  /* --- данные --- */
  const { data: warehouses = [] } = useQuery<Warehouse[]>({
    queryKey: ["bo-warehouses"],
    queryFn: () => boFetch("warehouses"),
  });

  const { data: stock = [], isLoading } = useQuery<StockItem[]>({
    queryKey: ["bo-stock"],
    queryFn: () => boFetch("stock"),
  });

  /* --- мутация: движение --- */
  const moveMut = useMutation({
    mutationFn: (data: Partial<MovementForm>) =>
      boFetch("stock_movement", "POST", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bo-stock"] });
      toast({ title: "Движение проведено" });
      setMoveOpen(false);
    },
    onError: (e: Error) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  /* --- выбираем первый склад если не выбран --- */
  const whId = activeWarehouse || (warehouses.length > 0 ? warehouses[0].id : 0);

  /* --- фильтрация --- */
  const filtered = stock.filter(
    (s) => s.warehouse_id === whId && s.item_type === activeType,
  );

  /* --- открыть dialog прихода/расхода --- */
  const openMovement = (item: StockItem, type: "in" | "out") => {
    setMoveForm({
      warehouse_id: item.warehouse_id,
      item_type: item.item_type,
      item_id: item.item_id,
      item_name: item.item_name ?? `#${item.item_id}`,
      movement_type: type,
      qty: 0,
      reason: "",
    });
    setMoveOpen(true);
  };

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-slate-800">Склад</h1>

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
        <div className="flex items-center gap-2 text-slate-400"><Icon name="Loader2" size={20} className="animate-spin" /> Загрузка...</div>
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
                          onClick={() => openMovement(s, "in")}
                          className="gap-1 text-green-700 border-green-300 hover:bg-green-50"
                        >
                          <Icon name="ArrowDownToLine" size={14} /> Приход
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openMovement(s, "out")}
                          className="gap-1 text-red-700 border-red-300 hover:bg-red-50"
                        >
                          <Icon name="ArrowUpFromLine" size={14} /> Расход
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

      {/* --- Dialog: движение --- */}
      <Dialog open={moveOpen} onOpenChange={setMoveOpen}>
        <DialogContent className="max-w-sm bg-white text-slate-800">
          <DialogHeader>
            <DialogTitle>
              {moveForm?.movement_type === "in" ? "Приход" : "Расход"}: {moveForm?.item_name}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">Количество</label>
              <Input
                className="bg-white text-slate-800 border-slate-300"
                type="number"
                min={0}
                step="0.01"
                value={moveForm?.qty ?? 0}
                onChange={(e) => setMoveForm((p) => p ? { ...p, qty: Number(e.target.value) } : p)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">Причина / комментарий</label>
              <Input
                className="bg-white text-slate-800 border-slate-300"
                value={moveForm?.reason ?? ""}
                onChange={(e) => setMoveForm((p) => p ? { ...p, reason: e.target.value } : p)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setMoveOpen(false)} className="text-slate-600 border-slate-300">Отмена</Button>
            <Button
              disabled={moveMut.isPending || !moveForm?.qty}
              onClick={() => {
                if (!moveForm) return;
                moveMut.mutate({
                  warehouse_id: moveForm.warehouse_id,
                  item_type: moveForm.item_type,
                  item_id: moveForm.item_id,
                  movement_type: moveForm.movement_type,
                  qty: moveForm.qty,
                  reason: moveForm.reason,
                });
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {moveMut.isPending ? "Проводка..." : "Провести"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
