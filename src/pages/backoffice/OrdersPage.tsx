import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  boFetch,
  Order,
  OrderItem,
  Client,
  FinishedProduct,
  Warehouse,
  ORDER_STATUSES,
} from "@/pages/backoffice/types";
import Icon from "@/components/ui/icon";
import ProductPicker from "@/components/backoffice/ProductPicker";
import { printOrder } from "@/pages/backoffice/printTemplates";
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

/* ---------- константы ---------- */

const STATUS_COLORS: Record<string, string> = {
  confirmed: "bg-blue-100 text-blue-700",
  in_production: "bg-orange-100 text-orange-700",
  ready: "bg-green-100 text-green-700",
  shipped: "bg-purple-100 text-purple-700",
  completed: "bg-slate-100 text-slate-600",
  cancelled: "bg-red-100 text-red-700",
};
const statusLabel = (v: string) => ORDER_STATUSES.find((s) => s.value === v)?.label ?? v;

/* ---------- пустой заказ ---------- */
const EMPTY_ORDER: Partial<Order> = {
  client_id: 0, status: "confirmed", manager_name: "", priority: 1,
  deadline: "", notes: "", items: [],
};
const EMPTY_ITEM: Partial<OrderItem> = {
  finished_product_id: 0, qty: 1, unit_price: 0, total_price: 0, notes: "",
};

/* ============================================================ */

export default function OrdersPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("");
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);

  /* --- Dialog создания --- */
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<Partial<Order>>(EMPTY_ORDER);
  const [itemRows, setItemRows] = useState<Partial<OrderItem>[]>([]);

  /* --- данные --- */
  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ["bo-orders"],
    queryFn: () => boFetch("orders"),
  });
  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["bo-clients"],
    queryFn: () => boFetch("clients"),
  });
  const { data: products = [] } = useQuery<FinishedProduct[]>({
    queryKey: ["bo-finished-products"],
    queryFn: () => boFetch("finished_products"),
  });
  const { data: warehouses = [] } = useQuery<Warehouse[]>({
    queryKey: ["bo-warehouses"],
    queryFn: () => boFetch("warehouses"),
  });

  /* --- мутации --- */
  const saveOrder = useMutation({
    mutationFn: (data: Partial<Order>) =>
      boFetch("orders", data.id ? "PUT" : "POST", { ...data, items: itemRows }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bo-orders"] });
      toast({ title: "Заказ сохранён" });
      setCreateOpen(false);
      setDetailOrder(null);
    },
    onError: (e: Error) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  const changeStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      boFetch("orders", "PUT", { id, status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bo-orders"] });
      toast({ title: "Статус обновлён" });
      setDetailOrder(null);
    },
    onError: (e: Error) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  const createWorkOrder = useMutation({
    mutationFn: (data: {
      order_id: number;
      order_item_id: number;
      finished_product_id: number;
      qty: number;
      warehouse_id: number;
      operations?: { operation_id: number; material_id?: number | null; planned_material_norm?: number }[];
    }) => boFetch("work_orders", "POST", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bo-work-orders"] });
      toast({ title: "Заказ-наряд создан" });
    },
    onError: (e: Error) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  /* --- helpers --- */
  const openCreate = () => {
    setForm(EMPTY_ORDER);
    setItemRows([]);
    setCreateOpen(true);
  };
  const openEdit = (o: Order) => {
    setForm({ ...o });
    setItemRows(o.items?.map((it) => ({ ...it })) ?? []);
    setCreateOpen(true);
  };

  const updateItem = (idx: number, patch: Partial<OrderItem>) => {
    setItemRows((p) =>
      p.map((r, i) => {
        if (i !== idx) return r;
        const next = { ...r, ...patch };
        next.total_price = (next.qty ?? 0) * (next.unit_price ?? 0);
        return next;
      }),
    );
  };
  const removeItem = (idx: number) => setItemRows((p) => p.filter((_, i) => i !== idx));

  /* --- фильтрация --- */
  const filtered = statusFilter
    ? orders.filter((o) => o.status === statusFilter)
    : orders;

  /* --- ЗН dialog --- */
  const [woDialogOpen, setWoDialogOpen] = useState(false);
  const [woItem, setWoItem] = useState<OrderItem | null>(null);
  const [woWarehouse, setWoWarehouse] = useState<number>(0);

  const openWoDialog = (item: OrderItem) => {
    setWoItem(item);
    setWoWarehouse(warehouses[0]?.id ?? 0);
    setWoDialogOpen(true);
  };

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Заказы</h1>
        <div className="flex flex-wrap gap-2">
          <select
            className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-800"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">Все статусы</option>
            {ORDER_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <Button onClick={openCreate} className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white">
            <Icon name="Plus" size={16} /> Создать заказ
          </Button>
        </div>
      </div>

      {/* --- Таблица заказов --- */}
      {isLoading ? (
        <div className="flex items-center gap-2 text-slate-400"><Icon name="Loader2" size={20} className="animate-spin" /> Загрузка...</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">Номер</th>
                <th className="px-4 py-3">Клиент</th>
                <th className="px-4 py-3">Статус</th>
                <th className="px-4 py-3">Дедлайн</th>
                <th className="px-4 py-3 text-right">Сумма</th>
                <th className="px-4 py-3 text-right">Действия</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o, i) => (
                <tr
                  key={o.id}
                  className={`cursor-pointer transition-colors hover:bg-blue-50/50 ${i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}`}
                  onClick={() => setDetailOrder(o)}
                >
                  <td className="px-4 py-2.5 font-medium text-slate-700">{o.order_number}</td>
                  <td className="px-4 py-2.5 text-slate-600">{o.client_name || o.client_org || "-"}</td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[o.status] ?? "bg-slate-100 text-slate-600"}`}>
                      {statusLabel(o.status)}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-slate-600">
                    {o.deadline ? new Date(o.deadline).toLocaleDateString("ru") : "-"}
                  </td>
                  <td className="px-4 py-2.5 text-right font-medium text-slate-700">
                    {Number(o.total_amount).toLocaleString("ru")} r.
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); openEdit(o); }}
                    >
                      <Icon name="Pencil" size={15} />
                    </Button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Нет заказов</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ==================== Detail view ==================== */}
      <Dialog open={!!detailOrder} onOpenChange={() => setDetailOrder(null)}>
        <DialogContent className="max-w-2xl bg-white text-slate-800 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between gap-2 pr-6">
              <DialogTitle>Заказ {detailOrder?.order_number}</DialogTitle>
              {detailOrder && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => printOrder(detailOrder)}
                  className="gap-1.5 border-slate-300 text-slate-600"
                >
                  <Icon name="Printer" size={15} /> Печать
                </Button>
              )}
            </div>
          </DialogHeader>

          {detailOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-slate-500">Клиент:</span> <strong>{detailOrder.client_name || "-"}</strong></div>
                <div><span className="text-slate-500">Организация:</span> <strong>{detailOrder.client_org || "-"}</strong></div>
                <div><span className="text-slate-500">Менеджер:</span> <strong>{detailOrder.manager_name || "-"}</strong></div>
                <div><span className="text-slate-500">Приоритет:</span> <strong>{detailOrder.priority}</strong></div>
                <div><span className="text-slate-500">Дедлайн:</span> <strong>{detailOrder.deadline ? new Date(detailOrder.deadline).toLocaleDateString("ru") : "-"}</strong></div>
                <div><span className="text-slate-500">Статус:</span>{" "}
                  <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[detailOrder.status] ?? "bg-slate-100"}`}>
                    {statusLabel(detailOrder.status)}
                  </span>
                </div>
              </div>

              {detailOrder.notes && (
                <p className="text-sm text-slate-500"><span className="font-medium">Примечание:</span> {detailOrder.notes}</p>
              )}

              {/* смена статуса */}
              <div className="flex flex-wrap gap-1">
                {ORDER_STATUSES.filter((s) => s.value !== detailOrder.status).map((s) => (
                  <Button
                    key={s.value}
                    size="sm"
                    variant="outline"
                    onClick={() => changeStatus.mutate({ id: detailOrder.id, status: s.value })}
                    className="text-xs text-slate-600 border-slate-300"
                  >
                    {s.label}
                  </Button>
                ))}
              </div>

              {/* позиции */}
              <h3 className="text-sm font-semibold text-slate-700 pt-2 border-t border-slate-200">Позиции</h3>
              <div className="overflow-x-auto rounded border border-slate-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-left text-xs font-medium uppercase text-slate-500">
                      <th className="px-3 py-2">Продукция</th>
                      <th className="px-3 py-2 text-right">Кол-во</th>
                      <th className="px-3 py-2 text-right">Цена</th>
                      <th className="px-3 py-2 text-right">Итого</th>
                      <th className="px-3 py-2 text-right">ЗН</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(detailOrder.items ?? []).map((it, i) => (
                      <tr key={it.id} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                        <td className="px-3 py-2 text-slate-700">{it.product_name || `#${it.finished_product_id}`}</td>
                        <td className="px-3 py-2 text-right text-slate-600">{it.qty}</td>
                        <td className="px-3 py-2 text-right text-slate-600">{Number(it.unit_price).toLocaleString("ru")}</td>
                        <td className="px-3 py-2 text-right font-medium text-slate-700">{Number(it.total_price).toLocaleString("ru")}</td>
                        <td className="px-3 py-2 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openWoDialog(it)}
                            className="text-xs text-slate-600 border-slate-300"
                          >
                            <Icon name="Factory" size={13} className="mr-1" /> Создать ЗН
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="text-right font-semibold text-slate-800">
                Итого: {Number(detailOrder.total_amount).toLocaleString("ru")} r.
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ==================== Create / Edit Dialog ==================== */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl bg-white text-slate-800 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "Редактирование заказа" : "Новый заказ"}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-600">Клиент</label>
                <select
                  className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
                  value={form.client_id ?? 0}
                  onChange={(e) => setForm({ ...form, client_id: Number(e.target.value) })}
                >
                  <option value={0}>-- выберите --</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}{c.org ? ` (${c.org})` : ""}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-600">Менеджер</label>
                <Input className="bg-white text-slate-800 border-slate-300" value={form.manager_name ?? ""} onChange={(e) => setForm({ ...form, manager_name: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-600">Приоритет</label>
                <Input className="bg-white text-slate-800 border-slate-300" type="number" min={1} value={form.priority ?? 1} onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-600">Дедлайн</label>
                <Input className="bg-white text-slate-800 border-slate-300" type="date" value={form.deadline ?? ""} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">Примечания</label>
              <Textarea className="bg-white text-slate-800 border-slate-300" value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>

          {/* позиции */}
          <div className="mt-4 border-t border-slate-200 pt-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700">Позиции</h3>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setItemRows([...itemRows, { ...EMPTY_ITEM }])}
                className="gap-1 text-slate-600 border-slate-300"
              >
                <Icon name="Plus" size={14} /> Позиция
              </Button>
            </div>

            {itemRows.map((row, idx) => (
              <div key={idx} className="mb-2 flex items-end gap-2">
                <div className="flex-1">
                  <label className="mb-1 block text-xs text-slate-500">Продукция</label>
                  <ProductPicker
                    products={products}
                    value={row.finished_product_id ?? null}
                    onSelect={(prod) =>
                      updateItem(idx, {
                        finished_product_id: prod.id,
                        unit_price: prod.base_price ?? row.unit_price ?? 0,
                      })
                    }
                  />
                </div>
                <div className="w-20">
                  <label className="mb-1 block text-xs text-slate-500">Кол-во</label>
                  <Input className="h-9 bg-white text-slate-800 border-slate-300" type="number" min={1} value={row.qty ?? 1} onChange={(e) => updateItem(idx, { qty: Number(e.target.value) })} />
                </div>
                <div className="w-28">
                  <label className="mb-1 block text-xs text-slate-500">Цена</label>
                  <Input className="h-9 bg-white text-slate-800 border-slate-300" type="number" step="0.01" value={row.unit_price ?? 0} onChange={(e) => updateItem(idx, { unit_price: Number(e.target.value) })} />
                </div>
                <div className="w-24 text-right text-sm font-medium text-slate-700 pb-1">
                  {((row.qty ?? 0) * (row.unit_price ?? 0)).toLocaleString("ru")} r.
                </div>
                <Button size="sm" variant="ghost" onClick={() => removeItem(idx)}>
                  <Icon name="X" size={14} className="text-red-500" />
                </Button>
              </div>
            ))}
            {itemRows.length === 0 && <p className="text-xs text-slate-400">Позиции не добавлены</p>}
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setCreateOpen(false)} className="text-slate-600 border-slate-300">Отмена</Button>
            <Button onClick={() => saveOrder.mutate(form)} disabled={saveOrder.isPending} className="bg-blue-600 hover:bg-blue-700 text-white">
              {saveOrder.isPending ? "Сохранение..." : "Сохранить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================== WO Dialog ==================== */}
      <Dialog open={woDialogOpen} onOpenChange={setWoDialogOpen}>
        <DialogContent className="max-w-sm bg-white text-slate-800">
          <DialogHeader>
            <DialogTitle>Создание заказ-наряда</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <p className="text-sm text-slate-600">
              Изделие: <strong>{woItem?.product_name || `#${woItem?.finished_product_id}`}</strong>,
              Кол-во: <strong>{woItem?.qty}</strong>
            </p>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">Склад</label>
              <select
                className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
                value={woWarehouse}
                onChange={(e) => setWoWarehouse(Number(e.target.value))}
              >
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>{w.name} ({w.city})</option>
                ))}
              </select>
            </div>

            <div className="flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm text-slate-600">
              <Icon name="Info" size={16} className="mt-0.5 flex-shrink-0 text-blue-500" />
              <span>Система автоматически разложит изделие на полуфабрикаты и операции по его спецификации — вручную ничего указывать не нужно.</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWoDialogOpen(false)} className="text-slate-600 border-slate-300">Отмена</Button>
            <Button
              disabled={createWorkOrder.isPending}
              onClick={() => {
                if (!woItem || !detailOrder) return;
                createWorkOrder.mutate({
                  order_id: detailOrder.id,
                  order_item_id: woItem.id,
                  finished_product_id: woItem.finished_product_id,
                  qty: woItem.qty,
                  warehouse_id: woWarehouse,
                });
                setWoDialogOpen(false);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {createWorkOrder.isPending ? "Создание..." : "Создать"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}