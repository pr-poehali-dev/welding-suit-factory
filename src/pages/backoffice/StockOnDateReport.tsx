import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  boFetch,
  Warehouse,
  StockOnDateReport as StockReport,
  StockOnDateRow,
} from "@/pages/backoffice/types";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const money = (v: number) =>
  Number(v || 0).toLocaleString("ru", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const qtyFmt = (v: number) => Number(v || 0).toLocaleString("ru", { maximumFractionDigits: 4 });

const rowKey = (r: StockOnDateRow) => `${r.item_type}:${r.item_id}`;

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function StockOnDateReportPage() {
  const [date, setDate] = useState(today());
  const [warehouseId, setWarehouseId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>("material");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data: warehouses = [] } = useQuery<Warehouse[]>({
    queryKey: ["bo-warehouses"],
    queryFn: () => boFetch("warehouses"),
  });

  const { data: report, isLoading, isFetching } = useQuery<StockReport>({
    queryKey: ["bo-report-stock-on-date", date, warehouseId],
    queryFn: () =>
      boFetch("report_stock_on_date", "GET", undefined, {
        date,
        ...(warehouseId ? { warehouse_id: warehouseId } : {}),
      }),
  });

  const sections = report?.sections ?? [];
  const activeSection = sections.find((s) => s.item_type === activeTab);

  // все ключи строк отчёта (для «выбрать все»)
  const allKeys = useMemo(() => {
    const set = new Set<string>();
    sections.forEach((s) => s.rows.forEach((r) => set.add(rowKey(r))));
    return set;
  }, [sections]);

  // при первой загрузке — выделяем все строки
  useEffect(() => {
    if (report) setSelected(new Set(allKeys));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report]);

  const toggleRow = (r: StockOnDateRow) => {
    const k = rowKey(r);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  };

  const toggleSectionAll = (checked: boolean) => {
    if (!activeSection) return;
    setSelected((prev) => {
      const next = new Set(prev);
      activeSection.rows.forEach((r) => {
        if (checked) next.add(rowKey(r));
        else next.delete(rowKey(r));
      });
      return next;
    });
  };

  const selectAllGlobal = () => setSelected(new Set(allKeys));
  const clearAll = () => setSelected(new Set());

  const allInSectionChecked =
    !!activeSection && activeSection.rows.length > 0 &&
    activeSection.rows.every((r) => selected.has(rowKey(r)));

  // данные для печати — только выбранные строки, только непустые секции
  const printSections = useMemo(
    () =>
      sections
        .map((s) => ({
          ...s,
          rows: s.rows.filter((r) => selected.has(rowKey(r))),
        }))
        .map((s) => ({
          ...s,
          total_amount: s.rows.reduce((a, r) => a + Number(r.amount || 0), 0),
        }))
        .filter((s) => s.rows.length > 0),
    [sections, selected],
  );

  const totalSelected = selected.size;
  const warehouseName =
    warehouses.find((w) => String(w.id) === warehouseId)?.name || "Все склады";

  return (
    <div>
      {/* ===== ПАНЕЛЬ (не печатается) ===== */}
      <div className="print:hidden">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <h1 className="text-2xl font-bold text-slate-800">Остатки на дату</h1>
          <Button
            onClick={() => window.print()}
            disabled={totalSelected === 0}
            className="gap-1.5 bg-blue-600 text-white hover:bg-blue-700"
          >
            <Icon name="Printer" size={16} /> Печать ({totalSelected})
          </Button>
        </div>

        <div className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-3">
          <div>
            <label className="mb-1 block text-xs text-slate-500">Дата</label>
            <Input
              type="date"
              value={date}
              max={today()}
              onChange={(e) => setDate(e.target.value)}
              className="h-9 w-44 border-slate-300 bg-white text-slate-800"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">Склад</label>
            <select
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
              className="h-9 w-56 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-800"
            >
              <option value="">Все склады</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>{w.name} ({w.city})</option>
              ))}
            </select>
          </div>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" onClick={selectAllGlobal} className="h-9 border-slate-300 text-slate-600">
              Выбрать все
            </Button>
            <Button variant="outline" onClick={clearAll} className="h-9 border-slate-300 text-slate-600">
              Снять все
            </Button>
          </div>
        </div>

        {/* Закладки по типам */}
        <div className="mb-3 flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1">
          {sections.map((s) => (
            <button
              key={s.item_type}
              onClick={() => setActiveTab(s.item_type)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                activeTab === s.item_type
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {s.label} <span className="text-xs text-slate-400">({s.rows.length})</span>
            </button>
          ))}
        </div>

        {isLoading || isFetching ? (
          <div className="flex items-center gap-2 text-slate-400">
            <Icon name="Loader2" size={20} className="animate-spin" /> Загрузка...
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={allInSectionChecked}
                      onChange={(e) => toggleSectionAll(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300"
                    />
                  </th>
                  <th className="px-4 py-3">Наименование</th>
                  <th className="px-4 py-3">Ед.</th>
                  <th className="px-4 py-3 text-right">Кол-во</th>
                  <th className="px-4 py-3 text-right">Цена</th>
                  <th className="px-4 py-3 text-right">Сумма</th>
                </tr>
              </thead>
              <tbody>
                {activeSection?.rows.map((r, i) => {
                  const checked = selected.has(rowKey(r));
                  return (
                    <tr key={rowKey(r)} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                      <td className="px-4 py-2.5">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleRow(r)}
                          className="h-4 w-4 rounded border-slate-300"
                        />
                      </td>
                      <td className="px-4 py-2.5 font-medium text-slate-700">{r.name}</td>
                      <td className="px-4 py-2.5 text-slate-500">{r.unit_short || "—"}</td>
                      <td className="px-4 py-2.5 text-right text-slate-700">{qtyFmt(r.qty)}</td>
                      <td className="px-4 py-2.5 text-right text-slate-500">{money(r.price)}</td>
                      <td className="px-4 py-2.5 text-right font-medium text-slate-700">{money(r.amount)}</td>
                    </tr>
                  );
                })}
                {(!activeSection || activeSection.rows.length === 0) && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Нет остатков</td></tr>
                )}
              </tbody>
              {activeSection && activeSection.rows.length > 0 && (
                <tfoot>
                  <tr className="border-t border-slate-200 bg-slate-50 font-semibold text-slate-700">
                    <td colSpan={5} className="px-4 py-2.5 text-right">Итого по разделу:</td>
                    <td className="px-4 py-2.5 text-right">{money(activeSection.total_amount)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>

      {/* ===== ПЕЧАТНАЯ ВЕРСИЯ (видна только при печати) ===== */}
      <div className="hidden print:block">
        <h2 className="mb-1 text-xl font-bold">Остатки товара на {date}</h2>
        <p className="mb-4 text-sm text-slate-600">Склад: {warehouseName}</p>

        {printSections.map((s) => (
          <div key={s.item_type} className="mb-5">
            <h3 className="mb-1 text-base font-semibold">{s.label}</h3>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-y border-slate-400 text-left">
                  <th className="py-1 pr-2">Наименование</th>
                  <th className="py-1 pr-2">Ед.</th>
                  <th className="py-1 pr-2 text-right">Кол-во</th>
                  <th className="py-1 pr-2 text-right">Цена</th>
                  <th className="py-1 text-right">Сумма</th>
                </tr>
              </thead>
              <tbody>
                {s.rows.map((r) => (
                  <tr key={rowKey(r)} className="border-b border-slate-200">
                    <td className="py-1 pr-2">{r.name}</td>
                    <td className="py-1 pr-2">{r.unit_short || "—"}</td>
                    <td className="py-1 pr-2 text-right">{qtyFmt(r.qty)}</td>
                    <td className="py-1 pr-2 text-right">{money(r.price)}</td>
                    <td className="py-1 text-right">{money(r.amount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-400 font-semibold">
                  <td colSpan={4} className="py-1 pr-2 text-right">Итого:</td>
                  <td className="py-1 text-right">{money(s.total_amount)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        ))}
        {printSections.length === 0 && <p>Не выбрано ни одной строки для печати.</p>}
      </div>
    </div>
  );
}
