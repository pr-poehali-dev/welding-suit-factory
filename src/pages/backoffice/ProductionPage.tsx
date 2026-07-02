import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  boFetch,
  WorkOrder,
  WorkOrderOperation,
  Worker,
} from "@/pages/backoffice/types";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
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

export default function ProductionPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("");
  const [detailWO, setDetailWO] = useState<WorkOrder | null>(null);

  /* --- данные --- */
  const { data: workOrders = [], isLoading } = useQuery<WorkOrder[]>({
    queryKey: ["bo-work-orders"],
    queryFn: () => boFetch("work_orders"),
  });
  const { data: workers = [] } = useQuery<Worker[]>({
    queryKey: ["bo-workers"],
    queryFn: () => boFetch("workers"),
  });

  /* --- мутация: закрыть операцию --- */
  const completeMut = useMutation({
    mutationFn: (data: { operation_id: number; worker_id: number; actual_material_norm?: number }) =>
      boFetch("complete_operation", "POST", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bo-work-orders"] });
      toast({ title: "Операция закрыта" });
      // обновим detail
      refreshDetail();
    },
    onError: (e: Error) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  const refreshDetail = () => {
    /* после invalidate нам нужно заново получить detail — через refetch */
    qc.invalidateQueries({ queryKey: ["bo-work-orders"] });
  };

  /* --- фильтр --- */
  const filtered = statusFilter
    ? workOrders.filter((w) => w.status === statusFilter)
    : workOrders;

  /* --- обновлённый detail из свежих данных --- */
  const detail = detailWO
    ? workOrders.find((w) => w.id === detailWO.id) ?? detailWO
    : null;

  const ops = detail?.operations ?? [];
  /* сортируем по sort_order */
  const sortedOps = [...ops].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Производство (заказ-наряды)</h1>
        <select
          className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-800"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">Все статусы</option>
          <option value="pending">Ожидает</option>
          <option value="in_progress">В работе</option>
          <option value="completed">Завершён</option>
          <option value="cancelled">Отменён</option>
        </select>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-slate-400"><Icon name="Loader2" size={20} className="animate-spin" /> Загрузка...</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">Номер ЗН</th>
                <th className="px-4 py-3">Заказ</th>
                <th className="px-4 py-3">Полуфабрикат</th>
                <th className="px-4 py-3 text-right">Кол-во</th>
                <th className="px-4 py-3">Статус</th>
                <th className="px-4 py-3">Склад</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((wo, i) => (
                <tr
                  key={wo.id}
                  className={`cursor-pointer transition-colors hover:bg-blue-50/50 ${i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}`}
                  onClick={() => setDetailWO(wo)}
                >
                  <td className="px-4 py-2.5 font-medium text-slate-700">{wo.work_order_number}</td>
                  <td className="px-4 py-2.5 text-slate-600">{wo.order_number || `#${wo.order_id}`}</td>
                  <td className="px-4 py-2.5 text-slate-600">{wo.semi_product_name || `#${wo.semi_product_id}`}</td>
                  <td className="px-4 py-2.5 text-right text-slate-600">{wo.qty}</td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${WO_STATUS_COLORS[wo.status] ?? "bg-slate-100"}`}>
                      {WO_STATUS_LABELS[wo.status] ?? wo.status}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-slate-600">{wo.warehouse_name || "-"}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Нет заказ-нарядов</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ==================== Detail Dialog ==================== */}
      <Dialog open={!!detail} onOpenChange={() => setDetailWO(null)}>
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
                <div><span className="text-slate-500">Заказ:</span> <strong>{detail.order_number}</strong></div>
                <div><span className="text-slate-500">Кол-во:</span> <strong>{detail.qty}</strong></div>
                <div><span className="text-slate-500">Склад:</span> <strong>{detail.warehouse_name}</strong></div>
              </div>

              <h3 className="text-sm font-semibold text-slate-700 pt-2 border-t border-slate-200">
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
            </div>
          )}
        </DialogContent>
      </Dialog>
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
  onComplete: (data: { operation_id: number; worker_id: number; actual_material_norm?: number }) => void;
  completing: boolean;
}) {
  const [workerId, setWorkerId] = useState<number>(op.worker_id ?? 0);
  const [actualNorm, setActualNorm] = useState<number>(op.actual_material_norm ?? op.planned_material_norm ?? 0);

  /* предыдущая операция завершена или это первая */
  const prevCompleted = idx === 0 || sortedOps[idx - 1]?.status === "completed";
  const canAct = prevCompleted && op.status !== "completed";

  return (
    <div className={`rounded-lg border p-3 ${op.status === "completed" ? "border-green-200 bg-green-50/50" : "border-slate-200 bg-white"}`}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">#{op.sort_order}</span>
          <span className="font-medium text-slate-700">{op.operation_name || `Операция #${op.operation_id}`}</span>
          <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${OP_STATUS_COLORS[op.status] ?? "bg-slate-100"}`}>
            {OP_STATUS_LABELS[op.status] ?? op.status}
          </span>
        </div>
        <span className="text-sm text-slate-500">{Number(op.labor_cost).toLocaleString("ru")} r.</span>
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
              {workers.filter((w) => w.is_active).map((w) => (
                <option key={w.id} value={w.id}>{w.full_name}</option>
              ))}
            </select>
          </div>

          {op.has_material_norm && (
            <div className="w-32">
              <label className="mb-1 block text-xs text-slate-500">
                Факт. норма (план: {op.planned_material_norm})
              </label>
              <Input
                className="h-9 bg-white text-slate-800 border-slate-300"
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
                ...(op.has_material_norm ? { actual_material_norm: actualNorm } : {}),
              })
            }
            className="bg-green-600 hover:bg-green-700 text-white gap-1"
          >
            <Icon name="Check" size={14} /> Закрыть
          </Button>
        </div>
      )}

      {op.status === "completed" && (
        <div className="flex gap-4 text-xs text-slate-500 mt-1">
          {op.worker_name && <span>Работник: {op.worker_name}</span>}
          {op.completed_at && <span>Завершена: {new Date(op.completed_at).toLocaleString("ru")}</span>}
          {op.has_material_norm && op.actual_material_norm != null && (
            <span>Факт. норма: {op.actual_material_norm}</span>
          )}
        </div>
      )}
    </div>
  );
}