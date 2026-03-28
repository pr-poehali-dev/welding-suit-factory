import { useQuery } from "@tanstack/react-query";
import { boFetch, OverconsumptionRow } from "@/pages/backoffice/types";
import Icon from "@/components/ui/icon";

export default function OverconsumptionReport() {
  const { data: rows = [], isLoading } = useQuery<OverconsumptionRow[]>({
    queryKey: ["bo-overconsumption"],
    queryFn: () => boFetch("report_overconsumption"),
  });

  /* --- итоги --- */
  const totalOveruseQty = rows.reduce((s, r) => s + Number(r.overuse_qty), 0);
  const totalOveruseCost = rows.reduce((s, r) => s + Number(r.overuse_cost), 0);

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-slate-800">Отчёт по перерасходу</h1>

      {isLoading ? (
        <div className="flex items-center gap-2 text-slate-400">
          <Icon name="Loader2" size={20} className="animate-spin" /> Загрузка...
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-slate-400">
          <Icon name="CheckCircle2" size={40} className="mx-auto mb-2 text-green-400" />
          <p>Перерасходов не обнаружено</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">ФИО работника</th>
                <th className="px-4 py-3">Таб. номер</th>
                <th className="px-4 py-3">Заказ-наряд</th>
                <th className="px-4 py-3">Заказ</th>
                <th className="px-4 py-3">Материал</th>
                <th className="px-4 py-3 text-right">Плановая</th>
                <th className="px-4 py-3 text-right">Фактическая</th>
                <th className="px-4 py-3 text-right">Перерасход (кол-во)</th>
                <th className="px-4 py-3 text-right">Перерасход (руб.)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                  <td className="px-4 py-2.5 font-medium text-slate-700">{r.worker_name}</td>
                  <td className="px-4 py-2.5 font-mono text-slate-600">{r.tab_number}</td>
                  <td className="px-4 py-2.5 text-slate-600">{r.work_order_number}</td>
                  <td className="px-4 py-2.5 text-slate-600">{r.order_number}</td>
                  <td className="px-4 py-2.5 text-slate-600">{r.material_name}</td>
                  <td className="px-4 py-2.5 text-right text-slate-600">
                    {Number(r.planned_material_norm).toLocaleString("ru", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-2.5 text-right text-slate-600">
                    {Number(r.actual_material_norm).toLocaleString("ru", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-2.5 text-right font-medium text-red-600">
                    +{Number(r.overuse_qty).toLocaleString("ru", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-2.5 text-right font-medium text-red-600">
                    {Number(r.overuse_cost).toLocaleString("ru", { minimumFractionDigits: 2 })} r.
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-300 bg-slate-50 font-semibold">
                <td colSpan={7} className="px-4 py-3 text-right text-slate-700">Итого:</td>
                <td className="px-4 py-3 text-right text-red-700">
                  +{totalOveruseQty.toLocaleString("ru", { minimumFractionDigits: 2 })}
                </td>
                <td className="px-4 py-3 text-right text-red-700">
                  {totalOveruseCost.toLocaleString("ru", { minimumFractionDigits: 2 })} r.
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
