import { useQuery } from "@tanstack/react-query";
import { boFetch, Order, WorkOrder, StockItem, Client } from "@/pages/backoffice/types";
import Icon from "@/components/ui/icon";

interface StatCard {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: string;
  color: string;
}

export default function Dashboard() {
  const orders = useQuery<Order[]>({ queryKey: ["bo-orders"], queryFn: () => boFetch("orders") });
  const workOrders = useQuery<WorkOrder[]>({ queryKey: ["bo-work-orders"], queryFn: () => boFetch("work_orders") });
  const stock = useQuery<StockItem[]>({ queryKey: ["bo-stock"], queryFn: () => boFetch("stock") });
  const clients = useQuery<Client[]>({ queryKey: ["bo-clients"], queryFn: () => boFetch("clients") });

  const ordersData = orders.data ?? [];
  const woData = workOrders.data ?? [];

  const cards: StatCard[] = [
    {
      title: "Заказы",
      value: ordersData.length,
      subtitle: `В производстве: ${ordersData.filter((o) => o.status === "in_production").length}`,
      icon: "ClipboardList",
      color: "bg-blue-50 text-blue-600",
    },
    {
      title: "Заказ-наряды",
      value: woData.length,
      subtitle: `Ожидают: ${woData.filter((w) => w.status === "pending").length} / В работе: ${woData.filter((w) => w.status === "in_progress").length}`,
      icon: "Factory",
      color: "bg-orange-50 text-orange-600",
    },
    {
      title: "Позиций на складе",
      value: stock.data?.length ?? 0,
      icon: "Warehouse",
      color: "bg-green-50 text-green-600",
    },
    {
      title: "Клиенты",
      value: clients.data?.length ?? 0,
      icon: "Users",
      color: "bg-purple-50 text-purple-600",
    },
  ];

  const loading = orders.isLoading || workOrders.isLoading || stock.isLoading || clients.isLoading;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-800">Дашборд</h1>

      {loading ? (
        <div className="flex items-center gap-2 text-slate-400">
          <Icon name="Loader2" size={20} className="animate-spin" />
          Загрузка...
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => (
            <div
              key={card.title}
              className="flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${card.color}`}>
                <Icon name={card.icon} size={24} />
              </div>
              <div>
                <p className="text-sm text-slate-500">{card.title}</p>
                <p className="text-2xl font-bold text-slate-800">{card.value}</p>
                {card.subtitle && <p className="mt-0.5 text-xs text-slate-400">{card.subtitle}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Последние заказы */}
      <div className="mt-8">
        <h2 className="mb-3 text-lg font-semibold text-slate-700">Последние заказы</h2>
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">Номер</th>
                <th className="px-4 py-3">Клиент</th>
                <th className="px-4 py-3">Статус</th>
                <th className="px-4 py-3">Дедлайн</th>
                <th className="px-4 py-3 text-right">Сумма</th>
              </tr>
            </thead>
            <tbody>
              {ordersData.slice(0, 10).map((o, i) => (
                <tr key={o.id} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                  <td className="px-4 py-2.5 font-medium text-slate-700">{o.order_number}</td>
                  <td className="px-4 py-2.5 text-slate-600">{o.client_name || "-"}</td>
                  <td className="px-4 py-2.5">
                    <StatusBadge status={o.status} />
                  </td>
                  <td className="px-4 py-2.5 text-slate-600">{o.deadline ? new Date(o.deadline).toLocaleDateString("ru") : "-"}</td>
                  <td className="px-4 py-2.5 text-right font-medium text-slate-700">
                    {Number(o.total_amount).toLocaleString("ru")} r.
                  </td>
                </tr>
              ))}
              {ordersData.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    Заказов пока нет
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* --- вспомогательный badge --- */

const STATUS_COLORS: Record<string, string> = {
  confirmed: "bg-blue-100 text-blue-700",
  in_production: "bg-orange-100 text-orange-700",
  ready: "bg-green-100 text-green-700",
  shipped: "bg-purple-100 text-purple-700",
  completed: "bg-slate-100 text-slate-600",
  cancelled: "bg-red-100 text-red-700",
};

const STATUS_LABELS: Record<string, string> = {
  confirmed: "Подтверждён",
  in_production: "В производстве",
  ready: "Готов",
  shipped: "Отгружен",
  completed: "Завершён",
  cancelled: "Отменён",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[status] ?? "bg-slate-100 text-slate-600"}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
