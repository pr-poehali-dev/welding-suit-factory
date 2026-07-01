import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import Icon from "@/components/ui/icon";
import { useAuth } from "@/context/AuthContext";
import { accessLevelLabel } from "@/pages/backoffice/types";

/* ---------- типы ---------- */

interface NavItem {
  label: string;
  icon: string;
  path?: string;
  module?: string;
  children?: NavItem[];
}

/* ---------- структура меню ---------- */

const NAV_ITEMS: NavItem[] = [
  { label: "Дашборд", icon: "LayoutDashboard", path: "/backoffice", module: "dashboard" },
  { label: "Заказы", icon: "ClipboardList", path: "/backoffice/orders", module: "orders" },
  { label: "Производство", icon: "Factory", path: "/backoffice/production", module: "production" },
  { label: "Склад", icon: "Warehouse", path: "/backoffice/stock", module: "stock" },
  {
    label: "Справочники",
    icon: "BookOpen",
    children: [
      { label: "Клиенты", icon: "Users", path: "/backoffice/clients", module: "clients" },
      { label: "Сотрудники", icon: "UserCog", path: "/backoffice/workers", module: "workers" },
      { label: "Материалы", icon: "Scissors", path: "/backoffice/materials", module: "materials" },
      { label: "Фурнитура", icon: "Package", path: "/backoffice/fittings", module: "fittings" },
      { label: "Операции", icon: "Settings", path: "/backoffice/operations", module: "operations" },
      {
        label: "Полуфабрикаты",
        icon: "Layers",
        path: "/backoffice/semi-products",
        module: "semi_products",
      },
      {
        label: "Готовая продукция",
        icon: "Box",
        path: "/backoffice/finished-products",
        module: "finished_products",
      },
      {
        label: "Единицы измерения",
        icon: "Ruler",
        path: "/backoffice/units",
        module: "units",
      },
    ],
  },
  {
    label: "Отчёты",
    icon: "BarChart3",
    children: [
      {
        label: "Перерасход",
        icon: "AlertTriangle",
        path: "/backoffice/reports/overconsumption",
        module: "reports",
      },
      {
        label: "Себестоимость",
        icon: "Calculator",
        path: "/backoffice/reports/cost",
        module: "reports",
      },
    ],
  },
];

/* ---------- компонент ---------- */

interface BackofficeLayoutProps {
  children: React.ReactNode;
}

export default function BackofficeLayout({ children }: BackofficeLayoutProps) {
  const location = useLocation();
  const { user, canModule, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  /* --- фильтрация меню по правам --- */
  const filterNav = (items: NavItem[]): NavItem[] =>
    items
      .map((item) => {
        if (item.children) {
          const children = filterNav(item.children);
          return children.length ? { ...item, children } : null;
        }
        if (item.module && !canModule(item.module)) return null;
        return item;
      })
      .filter(Boolean) as NavItem[];

  const visibleNav = filterNav(NAV_ITEMS);
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({
    Справочники: true,
    "Отчёты": true,
  });

  const toggleSection = (label: string) => {
    setExpandedSections((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const isActive = (path?: string) => {
    if (!path) return false;
    if (path === "/backoffice") return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  const hasActiveChild = (item: NavItem): boolean => {
    if (item.path && isActive(item.path)) return true;
    if (item.children) return item.children.some(hasActiveChild);
    return false;
  };

  /* --- отдельный пункт меню --- */
  const renderNavItem = (item: NavItem) => {
    // группа с вложенными пунктами
    if (item.children) {
      const expanded = expandedSections[item.label] ?? false;
      const groupActive = hasActiveChild(item);

      return (
        <div key={item.label}>
          <button
            onClick={() => toggleSection(item.label)}
            className={`
              flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium
              transition-colors hover:bg-slate-100
              ${groupActive ? "text-blue-600" : "text-slate-600"}
            `}
          >
            <span className="flex items-center gap-3">
              <Icon name={item.icon} size={18} />
              {item.label}
            </span>
            <Icon
              name="ChevronDown"
              size={16}
              className={`transition-transform ${expanded ? "rotate-180" : ""}`}
            />
          </button>

          {expanded && (
            <div className="ml-4 mt-1 flex flex-col gap-0.5 border-l border-slate-200 pl-3">
              {item.children.map(renderNavItem)}
            </div>
          )}
        </div>
      );
    }

    // обычный пункт
    const active = isActive(item.path);
    return (
      <Link
        key={item.path}
        to={item.path!}
        onClick={() => setSidebarOpen(false)}
        className={`
          flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors
          ${
            active
              ? "bg-blue-50 text-blue-600"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          }
        `}
      >
        <Icon name={item.icon} size={18} />
        {item.label}
      </Link>
    );
  };

  /* --- sidebar (содержимое) --- */
  const sidebarContent = (
    <nav className="flex flex-col gap-1 px-3 py-4">
      {visibleNav.map(renderNavItem)}
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      {/* ====== overlay (мобильный) ====== */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ====== sidebar ====== */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200
          bg-white transition-transform lg:static lg:translate-x-0
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* логотип */}
        <div className="flex h-14 items-center gap-2 border-b border-slate-200 px-4">
          <Icon name="Factory" size={22} className="text-blue-600" />
          <span className="text-lg font-bold tracking-tight text-slate-800">
            Бэкофис
          </span>
        </div>

        {/* скроллируемое меню */}
        <div className="flex-1 overflow-y-auto">{sidebarContent}</div>

        {/* нижняя плашка */}
        <div className="border-t border-slate-200 p-3">
          {user && (
            <div className="mb-2 flex items-center gap-2 rounded-lg bg-slate-50 px-2 py-1.5">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-600">
                {user.full_name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-slate-700 leading-tight">
                  {user.full_name}
                </div>
                <div className="truncate text-xs text-slate-400 leading-tight">
                  {accessLevelLabel(user.access_level)}
                </div>
              </div>
            </div>
          )}
          <button
            onClick={logout}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
          >
            <Icon name="LogOut" size={16} />
            Выйти из аккаунта
          </button>
        </div>
      </aside>

      {/* ====== правая часть (header + content) ====== */}
      <div className="flex flex-1 flex-col">
        {/* --- top bar --- */}
        <header className="sticky top-0 z-20 flex h-14 items-center gap-4 border-b border-slate-200 bg-white px-4 shadow-sm">
          {/* кнопка открытия sidebar на мобилке */}
          <button
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Icon name="Menu" size={22} />
          </button>

          {/* breadcrumb-область (можно расширить позже) */}
          <div className="flex-1" />

          {/* правая часть header */}
          {user && (
            <div className="flex items-center gap-2 border-r border-slate-200 pr-3 mr-1">
              <div className="hidden text-right sm:block">
                <div className="text-sm font-medium text-slate-700 leading-tight">{user.full_name}</div>
                <div className="text-xs text-slate-400 leading-tight">{accessLevelLabel(user.access_level)}</div>
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-600">
                {user.full_name.charAt(0).toUpperCase()}
              </div>
              <button
                onClick={logout}
                title="Выйти"
                className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
              >
                <Icon name="LogOut" size={18} />
              </button>
            </div>
          )}
          <Link
            to="/"
            className="flex items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-slate-800"
          >
            <Icon name="ExternalLink" size={16} />
            <span className="hidden sm:inline">На сайт</span>
          </Link>
        </header>

        {/* --- контент --- */}
        <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}