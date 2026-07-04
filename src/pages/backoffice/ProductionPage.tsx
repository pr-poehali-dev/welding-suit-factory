import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  boFetch,
  ProductionOrder,
  ProductionItem,
  ProductionWorkOrder,
  ItemComment,
  WorkOrder,
  WorkOrderOperation,
  WorkOrderTask,
  Worker,
} from "@/pages/backoffice/types";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/context/AuthContext";
import { printWorkOrder } from "@/pages/backoffice/printTemplates";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/* ---------- статусы ЗН ---------- */
const WO_STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  in_progress: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};
const WO_STATUS_LABELS: Record<string, string> = {
  pending: "Ожидает",
  in_progress: "В работе",
  completed: "Завершён",
  cancelled: "Отменён",
};

const OP_STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  in_progress: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
};
const OP_STATUS_LABELS: Record<string, string> = {
  pending: "Ожидает",
  in_progress: "В работе",
  completed: "Выполнена",
};

const TASK_STATUS_COLORS: Record<string, string> = {
  assigned: "bg-yellow-100 text-yellow-700",
  in_progress: "bg-blue-100 text-blue-700",
  done: "bg-green-100 text-green-700",
};
const TASK_STATUS_LABELS: Record<string, string> = {
  assigned: "Назначено",
  in_progress: "В работе",
  done: "Готово",
};

/* ---------- утилиты дат ---------- */
function formatDate(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("ru");
}

function isOverdue(value: string | null): boolean {
  if (!value) return false;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d < today;
}

export default function ProductionPage() {
  const qc = useQueryClient();
  const { can, user } = useAuth();

  const [expandedOrders, setExpandedOrders] = useState<Set<number>>(new Set());
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [openComments, setOpenComments] = useState<Set<number>>(new Set());
  const [detailWoId, setDetailWoId] = useState<number | null>(null);

  /* --- данные иерархии --- */
  const { data: orders = [], isLoading } = useQuery<ProductionOrder[]>({
    queryKey: ["bo-production"],
    queryFn: () => boFetch("production") as Promise<ProductionOrder[]>,
  });
  const { data: workers = [] } = useQuery<Worker[]>({
    queryKey: ["bo-workers"],
    queryFn: () => boFetch("workers") as Promise<Worker[]>,
  });

  /* --- полный список ЗН для Detail Dialog (операции + задания) --- */
  const { data: workOrders = [] } = useQuery<WorkOrder[]>({
    queryKey: ["bo-work-orders"],
    queryFn: () => boFetch("work_orders") as Promise<WorkOrder[]>,
    enabled: detailWoId !== null,
  });

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["bo-work-orders"] });
    qc.invalidateQueries({ queryKey: ["bo-production"] });
    qc.invalidateQueries({ queryKey: ["bo-stock"] });
  };

  /* --- мутация: закрыть операцию --- */
  const completeMut = useMutation<
    unknown,
    Error,
    { operation_id: number; worker_id: number; actual_material_norm?: number }
  >({
    mutationFn: (data) => boFetch("complete_operation", "POST", data),
    onSuccess: () => {
      invalidateAll();
      toast({ title: "Операция закрыта" });
    },
    onError: (e) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  /* --- мутация: назначить задание --- */
  const assignMut = useMutation<
    unknown,
    Error,
    { work_order_id: number; worker_id: number; qty: number }
  >({
    mutationFn: (data) => boFetch("assign_task", "POST", data),
    onSuccess: () => {
      invalidateAll();
      toast({ title: "Задание назначено" });
    },
    onError: (e) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  /* --- мутация: начать задание --- */
  const startMut = useMutation<unknown, Error, number>({
    mutationFn: (id) => boFetch("task_start", "POST", { id }),
    onSuccess: () => {
      invalidateAll();
      toast({ title: "Задание начато" });
    },
    onError: (e) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  /* --- мутация: завершить задание --- */
  const finishMut = useMutation<
    { labor_amount: number; duration_seconds: number },
    Error,
    { id: number; actual_material_qty?: number }
  >({
    mutationFn: (data) =>
      boFetch("task_finish", "POST", data) as Promise<{
        labor_amount: number;
        duration_seconds: number;
      }>,
    onSuccess: (res) => {
      invalidateAll();
      toast({
        title: `Задание выполнено, ФОТ: ${Number(res.labor_amount).toLocaleString("ru")} р.`,
      });
    },
    onError: (e) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  /* --- мутация: удалить заказ --- */
  const deleteOrderMut = useMutation<unknown, Error, number>({
    mutationFn: (id) => boFetch("orders", "DELETE", { id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bo-production"] });
      toast({ title: "Заказ удалён" });
    },
    onError: (e) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  /* --- мутация: добавить комментарий --- */
  const addCommentMut = useMutation<
    unknown,
    Error,
    { order_item_id: number; text: string }
  >({
    mutationFn: (data) => boFetch("item_comment", "POST", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bo-production"] });
    },
    onError: (e) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  /* --- мутация: удалить комментарий --- */
  const deleteCommentMut = useMutation<unknown, Error, number>({
    mutationFn: (id) => boFetch("item_comment", "DELETE", { id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bo-production"] });
    },
    onError: (e) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  /* --- переключатели раскрытия --- */
  const toggleSet = (
    set: Set<number>,
    setter: (v: Set<number>) => void,
    id: number,
  ) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setter(next);
  };

  /* --- обновлённый detail из свежих данных --- */
  const detail =
    detailWoId !== null
      ? workOrders.find((w) => w.id === detailWoId) ?? null
      : null;

  const ops = detail?.operations ?? [];
  const sortedOps = [...ops].sort((a, b) => a.sort_order - b.sort_order);

  const canEdit = can("orders.edit");

  const handleDeleteOrder = (order: ProductionOrder) => {
    if (
      window.confirm(
        `Удалить заказ ${order.order_number}? Действие необратимо.`,
      )
    ) {
      deleteOrderMut.mutate(order.id);
    }
  };

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Производство</h1>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-slate-400">
          <Icon name="Loader2" size={20} className="animate-spin" /> Загрузка...
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-8 text-center text-slate-400">
          Нет заявок в производстве
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const orderOpen = expandedOrders.has(order.id);
            const overdue = isOverdue(order.deadline);
            return (
              <div
                key={order.id}
                className="rounded-lg border border-slate-200 bg-white"
              >
                {/* ---------- Уровень 1: заявка ---------- */}
                <div className="flex items-center gap-3 px-4 py-3">
                  <button
                    type="button"
                    onClick={() =>
                      toggleSet(expandedOrders, setExpandedOrders, order.id)
                    }
                    className="flex flex-1 items-center gap-3 text-left"
                  >
                    <Icon
                      name={orderOpen ? "ChevronDown" : "ChevronRight"}
                      size={18}
                      className="shrink-0 text-slate-400"
                    />
                    <div className="flex flex-1 flex-wrap items-center gap-x-4 gap-y-1">
                      <span className="font-semibold text-slate-800">
                        {order.order_number}
                      </span>
                      <span
                        className={`text-sm ${overdue ? "font-medium text-red-600" : "text-slate-500"}`}
                      >
                        Дедлайн: {formatDate(order.deadline)}
                      </span>
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${WO_STATUS_COLORS[order.status] ?? "bg-slate-100 text-slate-600"}`}
                      >
                        {WO_STATUS_LABELS[order.status] ?? order.status}
                      </span>
                      {(order.client_name || order.client_org) && (
                        <span className="text-sm text-slate-500">
                          {order.client_name || order.client_org}
                          {order.client_name && order.client_org
                            ? ` (${order.client_org})`
                            : ""}
                        </span>
                      )}
                    </div>
                  </button>

                  {canEdit && (
                    <div className="flex shrink-0 items-center gap-1">
                      <a
                        href="/backoffice/orders"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100"
                        title="Редактировать заказ"
                      >
                        <Icon name="Pencil" size={16} />
                      </a>
                      <button
                        type="button"
                        onClick={() => handleDeleteOrder(order)}
                        disabled={deleteOrderMut.isPending}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-red-500 hover:bg-red-50 disabled:opacity-50"
                        title="Удалить заказ"
                      >
                        <Icon name="Trash2" size={16} />
                      </button>
                    </div>
                  )}
                </div>

                {/* ---------- Уровень 2: модели ---------- */}
                {orderOpen && (
                  <div className="border-t border-slate-200 px-4 py-3">
                    {order.items.length === 0 ? (
                      <p className="text-sm text-slate-400">Нет моделей</p>
                    ) : (
                      <div className="space-y-2">
                        {order.items.map((item) => (
                          <ModelRow
                            key={item.id}
                            item={item}
                            expanded={expandedItems.has(item.id)}
                            commentsOpen={openComments.has(item.id)}
                            onToggle={() =>
                              toggleSet(
                                expandedItems,
                                setExpandedItems,
                                item.id,
                              )
                            }
                            onToggleComments={() =>
                              toggleSet(openComments, setOpenComments, item.id)
                            }
                            onOpenWo={(id) => setDetailWoId(id)}
                            onAddComment={(text) =>
                              addCommentMut.mutate({
                                order_item_id: item.id,
                                text,
                              })
                            }
                            adding={addCommentMut.isPending}
                            onDeleteComment={(id) => deleteCommentMut.mutate(id)}
                            canEdit={canEdit}
                            currentUserId={user?.id ?? null}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ==================== Detail Dialog ==================== */}
      <Dialog open={!!detail} onOpenChange={() => setDetailWoId(null)}>
        <DialogContent className="max-w-3xl bg-white text-slate-800 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between gap-2 pr-6">
              <DialogTitle>
                ЗН {detail?.work_order_number} — {detail?.semi_product_name}
              </DialogTitle>
              {detail && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => printWorkOrder({ ...detail, operations: sortedOps })}
                  className="gap-1.5 border-slate-300 text-slate-600"
                >
                  <Icon name="Printer" size={15} /> Печать
                </Button>
              )}
            </div>
          </DialogHeader>

          {detail && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div>
                  <span className="text-slate-500">Заказ:</span>{" "}
                  <strong>{detail.order_number}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Кол-во:</span>{" "}
                  <strong>{detail.qty}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Склад:</span>{" "}
                  <strong>{detail.warehouse_name}</strong>
                </div>
              </div>

              <h3 className="border-t border-slate-200 pt-2 text-sm font-semibold text-slate-700">
                Операции
              </h3>

              <div className="space-y-2">
                {sortedOps.map((op, idx) => (
                  <OperationRow
                    key={op.id}
                    op={op}
                    idx={idx}
                    sortedOps={sortedOps}
                    workers={workers}
                    onComplete={(data) => completeMut.mutate(data)}
                    completing={completeMut.isPending}
                  />
                ))}
                {sortedOps.length === 0 && (
                  <p className="text-sm text-slate-400">Нет операций</p>
                )}
              </div>

              <TasksSection
                detail={detail}
                workers={workers}
                onAssign={(data) => assignMut.mutate(data)}
                assigning={assignMut.isPending}
                onStart={(id) => startMut.mutate(id)}
                starting={startMut.isPending}
                onFinish={(data) => finishMut.mutate(data)}
                finishing={finishMut.isPending}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ============================================================ */
/* Уровень 2: строка модели + полуфабрикаты + комментарии */
/* ============================================================ */

function ModelRow({
  item,
  expanded,
  commentsOpen,
  onToggle,
  onToggleComments,
  onOpenWo,
  onAddComment,
  adding,
  onDeleteComment,
  canEdit,
  currentUserId,
}: {
  item: ProductionItem;
  expanded: boolean;
  commentsOpen: boolean;
  onToggle: () => void;
  onToggleComments: () => void;
  onOpenWo: (id: number) => void;
  onAddComment: (text: string) => void;
  adding: boolean;
  onDeleteComment: (id: number) => void;
  canEdit: boolean;
  currentUserId: number | null;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/50">
      <div className="flex items-center gap-3 px-3 py-2">
        <button
          type="button"
          onClick={onToggle}
          className="flex flex-1 items-center gap-3 text-left"
        >
          <Icon
            name={expanded ? "ChevronDown" : "ChevronRight"}
            size={16}
            className="shrink-0 text-slate-400"
          />
          <div className="flex flex-1 flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-medium text-slate-800">
              {item.product_name || `Изделие #${item.finished_product_id}`}
              {item.size_label ? `, ${item.size_label}` : ""}
            </span>
            <span className="text-sm text-slate-500">
              Кол-во: <strong className="text-slate-700">{item.qty}</strong>
            </span>
            {item.active_spec_name ? (
              <span className="text-sm text-slate-500">
                Спецификация:{" "}
                <span className="text-slate-700">{item.active_spec_name}</span>
              </span>
            ) : (
              <span className="text-sm font-medium text-red-600">
                нет активной спецификации
              </span>
            )}
          </div>
        </button>

        <button
          type="button"
          onClick={onToggleComments}
          className="relative inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-slate-200"
          title="Комментарии"
        >
          <Icon name="MessageSquare" size={16} />
          {item.comments.length > 0 && (
            <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-medium text-white">
              {item.comments.length}
            </span>
          )}
        </button>
      </div>

      {/* лента комментариев */}
      {commentsOpen && (
        <CommentsFeed
          comments={item.comments}
          onAdd={onAddComment}
          adding={adding}
          onDelete={onDeleteComment}
          canEdit={canEdit}
          currentUserId={currentUserId}
        />
      )}

      {/* уровень 3: полуфабрикаты */}
      {expanded && (
        <div className="border-t border-slate-200 px-3 py-2">
          {item.work_orders.length === 0 ? (
            <p className="text-sm text-slate-400">Нет заказ-нарядов</p>
          ) : (
            <div className="space-y-2">
              {item.work_orders.map((wo) => (
                <SemiProductRow key={wo.id} wo={wo} onOpen={() => onOpenWo(wo.id)} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ============================================================ */
/* Уровень 3: строка полуфабриката (ЗН) */
/* ============================================================ */

function SemiProductRow({
  wo,
  onOpen,
}: {
  wo: ProductionWorkOrder;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left transition-colors hover:bg-blue-50/50"
    >
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-medium text-slate-700">
          {wo.semi_product_name || `ПФ #${wo.semi_product_id}`}
        </span>
        <span className="text-sm text-slate-500">× {wo.qty}</span>
        <span
          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${WO_STATUS_COLORS[wo.status] ?? "bg-slate-100 text-slate-600"}`}
        >
          {WO_STATUS_LABELS[wo.status] ?? wo.status}
        </span>
      </div>
      <span className="text-xs text-slate-500">
        Изготовлено {wo.done_qty}/{wo.qty}, назначено {wo.assigned_qty}
      </span>
    </button>
  );
}

/* ============================================================ */
/* Лента комментариев к модели */
/* ============================================================ */

function CommentsFeed({
  comments,
  onAdd,
  adding,
  onDelete,
  canEdit,
  currentUserId,
}: {
  comments: ItemComment[];
  onAdd: (text: string) => void;
  adding: boolean;
  onDelete: (id: number) => void;
  canEdit: boolean;
  currentUserId: number | null;
}) {
  const [text, setText] = useState("");

  const submit = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setText("");
  };

  return (
    <div className="border-t border-slate-200 bg-white px-3 py-3">
      <div className="space-y-2">
        {comments.length === 0 ? (
          <p className="text-sm text-slate-400">Комментариев пока нет</p>
        ) : (
          comments.map((c) => {
            const canDelete =
              canEdit || (currentUserId !== null && c.worker_id === currentUserId);
            return (
              <div
                key={c.id}
                className="flex items-start justify-between gap-2 rounded-md border border-slate-200 bg-slate-50/50 px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-slate-700">
                      {c.worker_full_name || c.author_name || "—"}
                    </span>
                    <span className="text-xs text-slate-400">
                      {new Date(c.created_at).toLocaleString("ru")}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap break-words text-sm text-slate-600">
                    {c.text}
                  </p>
                </div>
                {canDelete && (
                  <button
                    type="button"
                    onClick={() => onDelete(c.id)}
                    className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-red-500 hover:bg-red-50"
                    title="Удалить комментарий"
                  >
                    <Icon name="Trash2" size={14} />
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="mt-3 flex items-end gap-2">
        <Input
          className="h-9 flex-1 border-slate-300 bg-white text-slate-800"
          placeholder="Написать комментарий..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
        />
        <Button
          size="sm"
          disabled={adding || !text.trim()}
          onClick={submit}
          className="gap-1 bg-blue-600 text-white hover:bg-blue-700"
        >
          <Icon name="Send" size={14} /> Отправить
        </Button>
      </div>
    </div>
  );
}

/* ============================================================ */
/* Компонент строки операции */
/* ============================================================ */

function OperationRow({
  op,
  idx,
  sortedOps,
  workers,
  onComplete,
  completing,
}: {
  op: WorkOrderOperation;
  idx: number;
  sortedOps: WorkOrderOperation[];
  workers: Worker[];
  onComplete: (data: {
    operation_id: number;
    worker_id: number;
    actual_material_norm?: number;
  }) => void;
  completing: boolean;
}) {
  const [workerId, setWorkerId] = useState<number>(op.worker_id ?? 0);
  const [actualNorm, setActualNorm] = useState<number>(
    op.actual_material_norm ?? op.planned_material_norm ?? 0,
  );

  const prevCompleted = idx === 0 || sortedOps[idx - 1]?.status === "completed";
  const canAct = prevCompleted && op.status !== "completed";

  return (
    <div
      className={`rounded-lg border p-3 ${op.status === "completed" ? "border-green-200 bg-green-50/50" : "border-slate-200 bg-white"}`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">#{op.sort_order}</span>
          <span className="font-medium text-slate-700">
            {op.operation_name || `Операция #${op.operation_id}`}
          </span>
          <span
            className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${OP_STATUS_COLORS[op.status] ?? "bg-slate-100"}`}
          >
            {OP_STATUS_LABELS[op.status] ?? op.status}
          </span>
        </div>
        <span className="text-sm text-slate-500">
          {Number(op.labor_cost).toLocaleString("ru")} р.
        </span>
      </div>

      {canAct && (
        <div className="flex flex-wrap items-end gap-2">
          <div className="w-48">
            <label className="mb-1 block text-xs text-slate-500">Работник</label>
            <select
              className="flex h-9 w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-800"
              value={workerId}
              onChange={(e) => setWorkerId(Number(e.target.value))}
            >
              <option value={0}>-- выберите --</option>
              {workers
                .filter((w) => w.is_active)
                .map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.full_name}
                  </option>
                ))}
            </select>
          </div>

          {op.has_material_norm && (
            <div className="w-32">
              <label className="mb-1 block text-xs text-slate-500">
                Факт. норма (план: {op.planned_material_norm})
              </label>
              <Input
                className="h-9 border-slate-300 bg-white text-slate-800"
                type="number"
                step="0.001"
                value={actualNorm}
                onChange={(e) => setActualNorm(Number(e.target.value))}
              />
            </div>
          )}

          <Button
            size="sm"
            disabled={completing || !workerId}
            onClick={() =>
              onComplete({
                operation_id: op.id,
                worker_id: workerId,
                ...(op.has_material_norm
                  ? { actual_material_norm: actualNorm }
                  : {}),
              })
            }
            className="gap-1 bg-green-600 text-white hover:bg-green-700"
          >
            <Icon name="Check" size={14} /> Закрыть
          </Button>
        </div>
      )}

      {op.status === "completed" && (
        <div className="mt-1 flex gap-4 text-xs text-slate-500">
          {op.worker_name && <span>Работник: {op.worker_name}</span>}
          {op.completed_at && (
            <span>Завершена: {new Date(op.completed_at).toLocaleString("ru")}</span>
          )}
          {op.has_material_norm && op.actual_material_norm != null && (
            <span>Факт. норма: {op.actual_material_norm}</span>
          )}
        </div>
      )}
    </div>
  );
}

/* ============================================================ */
/* Раздел «Задания сотрудникам» */
/* ============================================================ */

function TasksSection({
  detail,
  workers,
  onAssign,
  assigning,
  onStart,
  starting,
  onFinish,
  finishing,
}: {
  detail: WorkOrder;
  workers: Worker[];
  onAssign: (data: {
    work_order_id: number;
    worker_id: number;
    qty: number;
  }) => void;
  assigning: boolean;
  onStart: (id: number) => void;
  starting: boolean;
  onFinish: (data: { id: number; actual_material_qty?: number }) => void;
  finishing: boolean;
}) {
  const assignedQty = detail.assigned_qty ?? 0;
  const doneQty = detail.done_qty ?? 0;
  const remaining = detail.qty - assignedQty;
  const tasks = detail.tasks ?? [];

  const [workerId, setWorkerId] = useState<number>(0);
  const [qty, setQty] = useState<number>(1);

  const canAssign = remaining > 0;

  return (
    <div className="space-y-3 border-t border-slate-200 pt-2">
      <h3 className="text-sm font-semibold text-slate-700">Задания сотрудникам</h3>

      <p className="text-sm text-slate-500">
        Назначено: <strong className="text-slate-700">{assignedQty}</strong> из{" "}
        <strong className="text-slate-700">{detail.qty}</strong>, изготовлено:{" "}
        <strong className="text-slate-700">{doneQty}</strong>
      </p>

      {canAssign && (
        <div className="flex flex-wrap items-end gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="w-48">
            <label className="mb-1 block text-xs text-slate-500">Сотрудник</label>
            <select
              className="flex h-9 w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-800"
              value={workerId}
              onChange={(e) => setWorkerId(Number(e.target.value))}
            >
              <option value={0}>-- выберите --</option>
              {workers
                .filter((w) => w.is_active)
                .map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.full_name}
                  </option>
                ))}
            </select>
          </div>
          <div className="w-32">
            <label className="mb-1 block text-xs text-slate-500">Количество</label>
            <Input
              className="h-9 border-slate-300 bg-white text-slate-800"
              type="number"
              min={1}
              max={remaining}
              value={qty}
              onChange={(e) => setQty(Number(e.target.value))}
            />
          </div>
          <Button
            size="sm"
            disabled={assigning || !workerId || qty < 1 || qty > remaining}
            onClick={() => {
              onAssign({ work_order_id: detail.id, worker_id: workerId, qty });
              setWorkerId(0);
              setQty(1);
            }}
            className="gap-1 bg-blue-600 text-white hover:bg-blue-700"
          >
            <Icon name="Plus" size={14} /> Назначить
          </Button>
        </div>
      )}

      <div className="space-y-2">
        {tasks.map((task) => (
          <TaskRow
            key={task.id}
            task={task}
            onStart={onStart}
            starting={starting}
            onFinish={onFinish}
            finishing={finishing}
          />
        ))}
        {tasks.length === 0 && (
          <p className="text-sm text-slate-400">Нет заданий</p>
        )}
      </div>
    </div>
  );
}

/* ============================================================ */
/* Строка задания */
/* ============================================================ */

function TaskRow({
  task,
  onStart,
  starting,
  onFinish,
  finishing,
}: {
  task: WorkOrderTask;
  onStart: (id: number) => void;
  starting: boolean;
  onFinish: (data: { id: number; actual_material_qty?: number }) => void;
  finishing: boolean;
}) {
  const [finishOpen, setFinishOpen] = useState(false);
  const [actualQty, setActualQty] = useState<string>("");

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-700">
            {task.worker_name || `Сотрудник #${task.worker_id}`}
          </span>
          <span className="text-sm text-slate-500">× {task.qty}</span>
          <span
            className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${TASK_STATUS_COLORS[task.status] ?? "bg-slate-100"}`}
          >
            {TASK_STATUS_LABELS[task.status] ?? task.status}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {task.status === "assigned" && (
            <Button
              size="sm"
              disabled={starting}
              onClick={() => onStart(task.id)}
              className="gap-1 bg-blue-600 text-white hover:bg-blue-700"
            >
              <Icon name="Play" size={14} /> Начать
            </Button>
          )}
          {task.status === "in_progress" && !finishOpen && (
            <Button
              size="sm"
              onClick={() => setFinishOpen(true)}
              className="gap-1 bg-green-600 text-white hover:bg-green-700"
            >
              <Icon name="Check" size={14} /> Завершить
            </Button>
          )}
          {task.status === "done" && (
            <span className="text-sm font-medium text-slate-700">
              ФОТ: {Number(task.labor_amount).toLocaleString("ru")} р.
            </span>
          )}
        </div>
      </div>

      {task.status === "in_progress" && finishOpen && (
        <div className="mt-3 flex flex-wrap items-end gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="w-40">
            <label className="mb-1 block text-xs text-slate-500">
              Факт. расход материала
            </label>
            <Input
              className="h-9 border-slate-300 bg-white text-slate-800"
              type="number"
              step="0.001"
              placeholder="необязательно"
              value={actualQty}
              onChange={(e) => setActualQty(e.target.value)}
            />
          </div>
          <Button
            size="sm"
            disabled={finishing}
            onClick={() => {
              const trimmed = actualQty.trim();
              onFinish({
                id: task.id,
                ...(trimmed !== "" ? { actual_material_qty: Number(trimmed) } : {}),
              });
              setFinishOpen(false);
            }}
            className="gap-1 bg-green-600 text-white hover:bg-green-700"
          >
            <Icon name="Check" size={14} /> Готово
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setFinishOpen(false)}
            className="border-slate-300 text-slate-600"
          >
            Отмена
          </Button>
        </div>
      )}

      {task.status === "done" && (
        <div className="mt-1 flex gap-4 text-xs text-slate-500">
          {task.duration_seconds != null && (
            <span>Длительность: {Math.round(task.duration_seconds / 60)} мин</span>
          )}
          {task.actual_material_qty != null && (
            <span>Факт. материал: {task.actual_material_qty}</span>
          )}
        </div>
      )}
    </div>
  );
}
