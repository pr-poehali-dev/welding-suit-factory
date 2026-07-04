import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import { boFetch } from "@/pages/backoffice/types";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";

interface DailyCell {
  day: number;
  in: number;
  out: number;
  balance: number;
}

interface DailyRow {
  item_id: number;
  name: string;
  unit_short: string;
  opening: number;
  closing: number;
  has_movement: boolean;
  daily: DailyCell[];
}

interface DailyReport {
  year: number;
  month: number;
  item_type: string;
  days_in_month: number;
  rows: DailyRow[];
}

const TABS = [
  { value: "material", label: "Материалы" },
  { value: "fitting", label: "Фурнитура" },
  { value: "semi_product", label: "Полуфабрикаты" },
  { value: "finished", label: "Готовая продукция" },
];

const MONTHS = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];

const num = (v: number) => Number(v || 0).toLocaleString("ru", { maximumFractionDigits: 3 });

export default function MaterialDailyReport() {
  const now = new Date();
  const [year, setYear] = useState<number>(now.getFullYear());
  const [month, setMonth] = useState<number>(now.getMonth() + 1);
  const [activeTab, setActiveTab] = useState<string>("material");
  const [onlyMoved, setOnlyMoved] = useState(true);

  const { data: report, isLoading, isFetching } = useQuery<DailyReport>({
    queryKey: ["bo-report-material-daily", year, month, activeTab],
    queryFn: () =>
      boFetch("report_material_daily", "GET", undefined, {
        year: String(year),
        month: String(month),
        item_type: activeTab,
      }) as Promise<DailyReport>,
  });

  const daysInMonth = report?.days_in_month ?? 31;
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const rows = (report?.rows ?? []).filter((r) => (onlyMoved ? r.has_movement : true));

  const years = Array.from({ length: 6 }, (_, i) => now.getFullYear() - i);

  const exportExcel = () => {
    if (!report) return;
    const header = ["Наименование", "Ед.", "На начало", ...days.map((d) => String(d)), "На конец"];
    const data = rows.map((r) => [
      r.name,
      r.unit_short,
      r.opening,
      ...r.daily.map((c) => c.balance),
      r.closing,
    ]);
    const ws = XLSX.utils.aoa_to_sheet([header, ...data]);
    const wb = XLSX.utils.book_new();
    const tabLabel = TABS.find((t) => t.value === activeTab)?.label ?? "";
    XLSX.utils.book_append_sheet(wb, ws, tabLabel.slice(0, 31));
    XLSX.writeFile(wb, `Статистика_${tabLabel}_${year}-${String(month).padStart(2, "0")}.xlsx`);
  };

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Статистика изменения количества материала</h1>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-800"
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
          >
            {MONTHS.map((m, i) => (
              <option key={i} value={i + 1}>{m}</option>
            ))}
          </select>
          <select
            className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-800"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          >
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <Button
            variant="outline"
            onClick={exportExcel}
            disabled={!report || rows.length === 0}
            className="gap-1.5 border-slate-300 text-slate-600"
          >
            <Icon name="Download" size={15} /> Excel
          </Button>
        </div>
      </div>

      {/* --- Вкладки типов --- */}
      <div className="mb-4 flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setActiveTab(t.value)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              activeTab === t.value
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <label className="mb-3 flex items-center gap-2 text-sm text-slate-600">
        <input
          type="checkbox"
          checked={onlyMoved}
          onChange={(e) => setOnlyMoved(e.target.checked)}
          className="h-4 w-4 rounded border-slate-300"
        />
        Только позиции с движением за месяц
      </label>

      {isLoading ? (
        <div className="flex items-center gap-2 text-slate-400">
          <Icon name="Loader2" size={20} className="animate-spin" /> Загрузка...
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-8 text-center text-slate-400">
          Нет данных за выбранный месяц
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          {isFetching && (
            <div className="border-b border-slate-100 bg-blue-50/50 px-3 py-1 text-xs text-blue-500">Обновление...</div>
          )}
          <table className="text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium uppercase tracking-wider text-slate-500">
                <th className="sticky left-0 z-10 bg-slate-50 px-3 py-2 text-left">Наименование</th>
                <th className="px-2 py-2 text-right">На начало</th>
                {days.map((d) => (
                  <th key={d} className="px-2 py-2 text-right">{d}</th>
                ))}
                <th className="px-2 py-2 text-right font-semibold text-slate-700">На конец</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.item_id} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/40"}>
                  <td className="sticky left-0 z-10 whitespace-nowrap bg-inherit px-3 py-1.5 font-medium text-slate-700">
                    {r.name}
                    {r.unit_short ? <span className="ml-1 text-xs text-slate-400">({r.unit_short})</span> : null}
                  </td>
                  <td className="px-2 py-1.5 text-right text-slate-500">{num(r.opening)}</td>
                  {r.daily.map((c) => {
                    const changed = c.in !== 0 || c.out !== 0;
                    return (
                      <td
                        key={c.day}
                        className={`px-2 py-1.5 text-right ${changed ? "font-medium text-slate-800" : "text-slate-400"}`}
                        title={changed ? `Приход: ${num(c.in)}, Расход: ${num(c.out)}` : undefined}
                      >
                        {num(c.balance)}
                      </td>
                    );
                  })}
                  <td className="px-2 py-1.5 text-right font-semibold text-slate-800">{num(r.closing)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
