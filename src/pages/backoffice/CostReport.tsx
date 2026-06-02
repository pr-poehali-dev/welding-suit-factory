import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { boFetch, Order, CostReport, CostItem } from "@/pages/backoffice/types";
import Icon from "@/components/ui/icon";

const money = (v: number) =>
  Number(v || 0).toLocaleString("ru", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function CostReportPage() {
  const [orderId, setOrderId] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const { data: orders = [] } = useQuery<Order[]>({
    queryKey: ["bo-orders"],
    queryFn: () => boFetch("orders"),
  });

  const { data: report, isLoading } = useQuery<CostReport>({
    queryKey: ["bo-report-cost", orderId],
    queryFn: () => boFetch("report_cost", "GET", undefined, { order_id: String(orderId) }),
    enabled: !!orderId,
  });

  const toggle = (id: number) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-slate-800">Себестоимость заказа</h1>

      <div className="mb-4 max-w-md">
        <label className="mb-1 block text-sm font-medium text-slate-600">Выберите заказ</label>
        <select
          className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
          value={orderId ?? ""}
          onChange={(e) => setOrderId(e.target.value ? Number(e.target.value) : null)}
        >
          <option value="">— не выбран —</option>
          {orders.map((o) => (
            <option key={o.id} value={o.id}>
              {o.order_number} {o.client_name ? `— ${o.client_name}` : ""}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-slate-400">
          Себестоимость считается по фактически потраченным материалам из заказ-нарядов.
        </p>
      </div>

      {!orderId ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-slate-400">
          <Icon name="Calculator" size={40} className="mx-auto mb-2 text-slate-300" />
          <p>Выберите заказ для расчёта себестоимости</p>
        </div>
      ) : isLoading ? (
        <div className="flex items-center gap-2 text-slate-400">
          <Icon name="Loader2" size={20} className="animate-spin" /> Загрузка...
        </div>
      ) : !report || report.items.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-slate-400">
          <p>В заказе нет изделий</p>
        </div>
      ) : (
        <>
          {/* --- сводка --- */}
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
            <SummaryCard label="Материалы" value={report.total_materials} icon="Scissors" color="text-blue-600" />
            <SummaryCard label="Фурнитура" value={report.total_fittings} icon="Package" color="text-purple-600" />
            <SummaryCard label="Труд" value={report.total_labor} icon="Hammer" color="text-orange-600" />
            <SummaryCard label="Себестоимость" value={report.total_cost} icon="Calculator" color="text-slate-700" bold />
            <SummaryCard
              label="Прибыль"
              value={report.total_margin}
              icon="TrendingUp"
              color={report.total_margin >= 0 ? "text-green-600" : "text-red-600"}
              bold
            />
          </div>

          {/* --- изделия --- */}
          <div className="space-y-2">
            {report.items.map((item) => (
              <ItemCard
                key={item.order_item_id}
                item={item}
                open={expanded.has(item.order_item_id)}
                onToggle={() => toggle(item.order_item_id)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function SummaryCard({
  label, value, icon, color, bold,
}: { label: string; value: number; icon: string; color: string; bold?: boolean }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="mb-1 flex items-center gap-1.5 text-xs text-slate-400">
        <Icon name={icon} size={14} className={color} />
        {label}
      </div>
      <div className={`${bold ? "text-lg font-bold" : "text-base font-semibold"} ${color}`}>
        {money(value)} р.
      </div>
    </div>
  );
}

function ItemCard({ item, open, onToggle }: { item: CostItem; open: boolean; onToggle: () => void }) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div
        className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-slate-50"
        onClick={onToggle}
      >
        <Icon name={open ? "ChevronDown" : "ChevronRight"} size={18} className="flex-shrink-0 text-slate-400" />
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-slate-800 truncate">{item.product_name}</div>
          <div className="text-xs text-slate-400">{item.qty} шт.</div>
        </div>
        <div className="flex flex-shrink-0 items-center gap-4 text-sm">
          <span className="text-slate-500">Себест.: <b className="text-slate-700">{money(item.cost)} р.</b></span>
          <span className={item.margin >= 0 ? "text-green-600" : "text-red-600"}>
            Прибыль: <b>{money(item.margin)} р.</b>
          </span>
        </div>
      </div>

      {open && (
        <div className="border-t border-slate-100 px-4 py-3 text-sm">
          <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Mini label="Материалы" value={item.materials_cost} />
            <Mini label="Фурнитура" value={item.fittings_cost} />
            <Mini label="Труд" value={item.labor_cost} />
            <Mini label="Выручка" value={item.revenue} />
          </div>

          {item.materials.length > 0 && (
            <div className="mb-3">
              <div className="mb-1 text-xs font-medium uppercase tracking-wider text-slate-400">
                Материалы (фактический расход)
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-400">
                    <th className="py-1">Название</th>
                    <th className="py-1 text-right">Расход</th>
                    <th className="py-1 text-right">Цена</th>
                    <th className="py-1 text-right">Сумма</th>
                  </tr>
                </thead>
                <tbody>
                  {item.materials.map((m) => (
                    <tr key={m.material_id} className="border-t border-slate-50">
                      <td className="py-1 text-slate-700">{m.material_name}</td>
                      <td className="py-1 text-right text-slate-600">
                        {money(m.used_qty)} {m.unit_short}
                      </td>
                      <td className="py-1 text-right text-slate-500">{money(m.price)} р.</td>
                      <td className="py-1 text-right font-medium text-slate-700">{money(m.cost)} р.</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {item.fittings.length > 0 && (
            <div>
              <div className="mb-1 text-xs font-medium uppercase tracking-wider text-slate-400">Фурнитура</div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-400">
                    <th className="py-1">Название</th>
                    <th className="py-1 text-right">Кол-во</th>
                    <th className="py-1 text-right">Цена</th>
                    <th className="py-1 text-right">Сумма</th>
                  </tr>
                </thead>
                <tbody>
                  {item.fittings.map((ft) => (
                    <tr key={ft.fitting_id} className="border-t border-slate-50">
                      <td className="py-1 text-slate-700">{ft.fitting_name}</td>
                      <td className="py-1 text-right text-slate-600">
                        {money(ft.total_qty)} {ft.unit_short}
                      </td>
                      <td className="py-1 text-right text-slate-500">{money(ft.price)} р.</td>
                      <td className="py-1 text-right font-medium text-slate-700">{money(ft.cost)} р.</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {item.materials.length === 0 && item.fittings.length === 0 && (
            <p className="text-xs text-slate-400">
              Нет данных о расходе материалов. Себестоимость появится после выполнения заказ-нарядов.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function Mini({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-slate-50 px-2 py-1.5">
      <div className="text-xs text-slate-400">{label}</div>
      <div className="text-sm font-medium text-slate-700">{money(value)} р.</div>
    </div>
  );
}
