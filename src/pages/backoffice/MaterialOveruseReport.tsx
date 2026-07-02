import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import { boFetch, OveruseReport } from "@/pages/backoffice/types";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";

const money = (v: number) =>
  Number(v || 0).toLocaleString("ru", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const qtyFmt = (v: number) => Number(v || 0).toLocaleString("ru", { maximumFractionDigits: 4 });

type Mode = "requisition" | "writeoff";

export default function MaterialOveruseReport() {
  const [mode, setMode] = useState<Mode>("requisition");

  const { data: report, isLoading } = useQuery<OveruseReport>({
    queryKey: ["bo-report-overuse", mode],
    queryFn: () => boFetch("report_material_overuse", "GET", undefined, { mode }),
  });

  const rows = report?.rows ?? [];

  const exportExcel = () => {
    if (rows.length === 0) {
      toast({ title: "Нет данных для выгрузки", variant: "destructive" });
      return;
    }
    const header = ["Заказ-наряд", "Материал", "Ед.", "Рабочий", "Норма", "Факт", "Перерасход", "Цена", "Сумма перерасхода"];
    const aoa: (string | number)[][] = [
      [mode === "requisition" ? "Перерасход по требованиям (факт − норма)" : "Перерасход по списанию"],
      [],
      header,
      ...rows.map((r) => [
        r.work_order_number || "—",
        r.material_name,
        r.unit_short || "",
        r.worker_name || "",
        Number(r.norm_qty ?? r.plan_qty ?? 0),
        Number(r.fact_qty),
        Number(r.overuse_qty),
        Number(r.price),
        Number(r.overuse_cost),
      ]),
      ["", "", "", "", "", "", "", "ИТОГО:", Number(report?.total_cost || 0)],
    ];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws["!cols"] = [{ wch: 16 }, { wch: 30 }, { wch: 6 }, { wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 16 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Перерасход");
    XLSX.writeFile(wb, `Перерасход_${mode}.xlsx`);
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <h1 className="text-2xl font-bold text-slate-800">Перерасход материалов</h1>
        <div className="flex gap-2">
          <Button onClick={exportExcel} variant="outline" disabled={rows.length === 0} className="gap-1.5 border-green-300 text-green-700 hover:bg-green-50">
            <Icon name="FileSpreadsheet" size={16} /> Excel
          </Button>
          <Button onClick={() => window.print()} disabled={rows.length === 0} className="gap-1.5 bg-blue-600 text-white hover:bg-blue-700">
            <Icon name="Printer" size={16} /> Печать
          </Button>
        </div>
      </div>

      <div className="mb-4 flex gap-1 rounded-lg bg-slate-100 p-1 print:hidden">
        <button
          onClick={() => setMode("requisition")}
          className={`rounded-md px-3 py-1.5 text-sm font-medium ${mode === "requisition" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"}`}
        >
          По требованиям (проверка)
        </button>
        <button
          onClick={() => setMode("writeoff")}
          className={`rounded-md px-3 py-1.5 text-sm font-medium ${mode === "writeoff" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"}`}
        >
          По списанию (оперативно)
        </button>
      </div>

      <p className="mb-3 text-sm text-slate-500 print:mb-1">
        {mode === "requisition"
          ? "Перерасход = (выдано − возвращено) минус норма из заказ-наряда. Для сверки после закрытия заказа/месяца."
          : "Перерасход = фактическая норма минус плановая из заказ-наряда. Оперативный предварительный анализ."}
      </p>

      {isLoading ? (
        <div className="flex items-center gap-2 text-slate-400"><Icon name="Loader2" size={20} className="animate-spin" /> Загрузка...</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase text-slate-500">
                <th className="px-4 py-3">Заказ-наряд</th>
                <th className="px-4 py-3">Материал</th>
                <th className="px-4 py-3">Рабочий</th>
                <th className="px-4 py-3 text-right">Норма</th>
                <th className="px-4 py-3 text-right">Факт</th>
                <th className="px-4 py-3 text-right">Перерасход</th>
                <th className="px-4 py-3 text-right">Сумма</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                  <td className="px-4 py-2.5 text-slate-700">{r.work_order_number || "—"}</td>
                  <td className="px-4 py-2.5 text-slate-700">{r.material_name} <span className="text-slate-400">{r.unit_short}</span></td>
                  <td className="px-4 py-2.5 text-slate-600">{r.worker_name || "—"}</td>
                  <td className="px-4 py-2.5 text-right text-slate-500">{qtyFmt(r.norm_qty ?? r.plan_qty ?? 0)}</td>
                  <td className="px-4 py-2.5 text-right text-slate-700">{qtyFmt(r.fact_qty)}</td>
                  <td className="px-4 py-2.5 text-right font-medium text-red-600">{qtyFmt(r.overuse_qty)}</td>
                  <td className="px-4 py-2.5 text-right font-medium text-red-600">{money(r.overuse_cost)}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">Перерасхода не выявлено</td></tr>
              )}
            </tbody>
            {rows.length > 0 && (
              <tfoot>
                <tr className="border-t border-slate-200 bg-slate-50 font-semibold text-slate-700">
                  <td colSpan={6} className="px-4 py-2.5 text-right">Итого перерасход:</td>
                  <td className="px-4 py-2.5 text-right text-red-600">{money(report?.total_cost || 0)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </div>
  );
}
