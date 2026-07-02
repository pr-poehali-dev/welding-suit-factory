import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { boFetch, WorkerPayrollRow } from "@/pages/backoffice/types";
import Icon from "@/components/ui/icon";
import { Input } from "@/components/ui/input";

const money = (v: number) => `${Number(v || 0).toLocaleString("ru")} р.`;

export default function PayrollPage() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { data: rows = [], isLoading } = useQuery<WorkerPayrollRow[]>({
    queryKey: ["bo-payroll", dateFrom, dateTo],
    queryFn: () =>
      boFetch("worker_payroll", "GET", undefined, {
        ...(dateFrom ? { date_from: dateFrom } : {}),
        ...(dateTo ? { date_to: dateTo } : {}),
      }),
  });

  const total = rows.reduce((sum, r) => sum + Number(r.total_amount || 0), 0);

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-slate-800">ФОТ по сотрудникам</h1>
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label className="mb-1 block text-xs text-slate-500">С даты</label>
            <Input
              className="h-10 bg-white text-slate-800 border-slate-300"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">По дату</label>
            <Input
              className="h-10 bg-white text-slate-800 border-slate-300"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-slate-400">
          <Icon name="Loader2" size={20} className="animate-spin" /> Загрузка...
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">Сотрудник</th>
                <th className="px-4 py-3 text-right">Кол-во заданий</th>
                <th className="px-4 py-3 text-right">Изготовлено ПФ</th>
                <th className="px-4 py-3 text-right">Начислено ФОТ</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.worker_id} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                  <td className="px-4 py-2.5 font-medium text-slate-700">
                    {r.worker_name || `#${r.worker_id}`}
                  </td>
                  <td className="px-4 py-2.5 text-right text-slate-600">
                    {Number(r.tasks_count).toLocaleString("ru")}
                  </td>
                  <td className="px-4 py-2.5 text-right text-slate-600">
                    {Number(r.total_qty).toLocaleString("ru")}
                  </td>
                  <td className="px-4 py-2.5 text-right font-medium text-slate-700">
                    {money(r.total_amount)}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                    Нет данных
                  </td>
                </tr>
              )}
            </tbody>
            {rows.length > 0 && (
              <tfoot>
                <tr className="border-t border-slate-200 bg-slate-50 font-semibold text-slate-800">
                  <td className="px-4 py-3" colSpan={3}>Итого</td>
                  <td className="px-4 py-3 text-right">{money(total)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </div>
  );
}
