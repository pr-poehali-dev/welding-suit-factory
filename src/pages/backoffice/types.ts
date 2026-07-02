// ============================================================
// Backoffice API — швейное производство
// ============================================================

export const BACKOFFICE_API =
  "https://functions.poehali.dev/f6ac7544-e889-4659-85ea-1f9249a72e08";

export const AUTH_API =
  "https://functions.poehali.dev/fb67a2f5-a6c6-4473-96dc-0b4c9ab91074";

export const AUTH_TOKEN_KEY = "bo_auth_token";

export function getAuthToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function setAuthToken(token: string | null) {
  if (token) localStorage.setItem(AUTH_TOKEN_KEY, token);
  else localStorage.removeItem(AUTH_TOKEN_KEY);
}

// -------------------- группы --------------------

export interface Group {
  id: number;
  entity_type: string;
  name: string;
  sort_order: number;
  parent_id: number | null;
  created_at: string;
}

// -------------------- справочники --------------------

export interface Unit {
  id: number;
  name: string;
  short_name: string;
  is_default: boolean;
  created_at: string;
}

export interface Warehouse {
  id: number;
  name: string;
  city: string;
  address: string;
  is_active: boolean;
  created_at: string;
}

export interface Client {
  id: number;
  name: string;
  org: string;
  phone: string;
  email: string;
  inn: string;
  address: string;
  notes: string;
  group_id: number | null;
  group_name?: string;
  created_at: string;
  updated_at: string;
}

export interface Worker {
  id: number;
  tab_number: string;
  full_name: string;
  position: string;
  phone: string;
  is_active: boolean;
  group_id: number | null;
  group_name?: string;
  created_at: string;
  login?: string | null;
  access_level?: string | null;
  is_blocked?: boolean;
  has_password?: boolean;
}

export interface WorkerPermission {
  permission_key: string;
  allowed: boolean;
}

// Уровни доступа (роли)
export const ACCESS_LEVELS: { value: string; label: string }[] = [
  { value: "director", label: "Генеральный директор" },
  { value: "manager", label: "Менеджер" },
  { value: "storekeeper", label: "Кладовщик" },
  { value: "economist", label: "Экономист" },
  { value: "production_head", label: "Начальник производства" },
  { value: "worker", label: "Рабочий (швея, раскройщик, упаковщик)" },
  { value: "technologist", label: "Технолог" },
];

export function accessLevelLabel(value?: string | null): string {
  return ACCESS_LEVELS.find((l) => l.value === value)?.label || "—";
}

// Шаблоны прав по ролям (зеркало бэкенда, для предзаполнения галочек)
export const ROLE_TEMPLATES: Record<string, Permissions> = {
  director: { __all__: true },
  manager: {
    "dashboard.view": true,
    "orders.view": true, "orders.edit": true,
    "clients.view": true, "clients.edit": true,
    "finished_products.view": true,
    "stock.view": true,
    "reports.view": true,
  },
  storekeeper: {
    "dashboard.view": true,
    "stock.view": true, "stock.edit": true,
    "materials.view": true,
    "fittings.view": true,
    "orders.view": true, "orders.hide_client": true,
  },
  economist: {
    "dashboard.view": true,
    "orders.view": true,
    "reports.view": true,
    "materials.view": true,
    "fittings.view": true,
    "finished_products.view": true,
    "stock.view": true,
  },
  production_head: {
    "dashboard.view": true,
    "production.view": true, "production.edit": true,
    "orders.view": true, "orders.hide_client": true,
    "operations.view": true,
    "semi_products.view": true,
    "stock.view": true, "stock.edit": true,
    "workers.view": true,
    "reports.view": true,
  },
  worker: {
    "production.view": true, "production.edit": true,
    "orders.hide_client": true,
  },
  technologist: {
    "dashboard.view": true,
    "operations.view": true, "operations.edit": true,
    "semi_products.view": true, "semi_products.edit": true,
    "finished_products.view": true, "finished_products.edit": true,
    "materials.view": true,
    "fittings.view": true,
    "orders.view": true, "orders.hide_client": true,
  },
};

// Каталог модулей и прав (для галочек в карточке сотрудника)
export interface PermModule {
  module: string;
  label: string;
  hasEdit: boolean;
  extra?: { key: string; label: string }[];
}

export const PERM_MODULES: PermModule[] = [
  { module: "dashboard", label: "Дашборд", hasEdit: false },
  {
    module: "orders",
    label: "Заказы",
    hasEdit: true,
    extra: [{ key: "orders.hide_client", label: "Скрывать заказчика (виден только № заявки)" }],
  },
  { module: "production", label: "Производство", hasEdit: true },
  { module: "stock", label: "Склад", hasEdit: true },
  { module: "clients", label: "Клиенты", hasEdit: true },
  { module: "workers", label: "Сотрудники", hasEdit: true },
  {
    module: "materials",
    label: "Материалы",
    hasEdit: true,
    extra: [{ key: "materials.delete", label: "Удаление материалов" }],
  },
  { module: "fittings", label: "Фурнитура", hasEdit: true },
  { module: "operations", label: "Операции", hasEdit: true },
  { module: "semi_products", label: "Полуфабрикаты", hasEdit: true },
  { module: "finished_products", label: "Готовая продукция", hasEdit: true },
  { module: "units", label: "Единицы измерения", hasEdit: true },
  { module: "reports", label: "Отчёты", hasEdit: false },
];

// -------------------- материалы / фурнитура --------------------

export interface Material {
  id: number;
  name: string;
  sku: string;
  unit_id: number;
  price_per_unit: number;
  description: string;
  is_active: boolean;
  group_id: number | null;
  group_name?: string;
  unit_name?: string;
  unit_short?: string;
  color?: string | null;
  density?: string | null;
  supplier_id?: number | null;
  supplier_name?: string | null;
  vat_rate_id?: number | null;
  vat_rate_name?: string | null;
  vat_rate?: number | null;
  stock_qty?: number;
  created_at: string;
  updated_at: string;
}

export interface Supplier {
  id: number;
  name: string;
  inn?: string | null;
  phone?: string | null;
  contact_person?: string | null;
  notes?: string | null;
  is_active: boolean;
  created_at: string;
}

export interface VatRate {
  id: number;
  name: string;
  rate: number;
  is_no_vat: boolean;
  is_active: boolean;
  sort_order: number;
}

export interface Fitting {
  id: number;
  name: string;
  sku: string;
  unit_id: number;
  price_per_unit: number;
  description: string;
  is_active: boolean;
  group_id: number | null;
  group_name?: string;
  unit_name?: string;
  unit_short?: string;
  created_at: string;
  updated_at: string;
}

// -------------------- операции --------------------

export interface Operation {
  id: number;
  name: string;
  description: string;
  has_material_norm: boolean;
  default_price: number;
  sort_order: number;
  is_active: boolean;
  group_id: number | null;
  group_name?: string;
  created_at: string;
}

// -------------------- полуфабрикаты --------------------

export interface SemiProductMaterial {
  id: number;
  semi_product_id: number;
  material_id: number;
  norm_qty: number;
  notes: string;
  material_name?: string;
  unit_short?: string;
}

export interface SemiProductOperation {
  id: number;
  semi_product_id: number;
  operation_id: number;
  labor_cost: number;
  sort_order: number;
  notes: string;
  operation_name?: string;
  has_material_norm?: boolean;
}

export type PfType = "material" | "labor" | "fittings" | "composite";

export interface SemiProduct {
  id: number;
  name: string;
  sku: string;
  description: string;
  is_active: boolean;
  group_id: number | null;
  group_name?: string;
  parent_group_name?: string;
  pf_type?: PfType;
  size_label?: string | null;
  product_id?: number | null;
  materials: SemiProductMaterial[];
  operations: SemiProductOperation[];
  components?: SemiProductComponent[];
}

export interface StockMaterial {
  id: number;
  name: string;
  sku: string;
  price_per_unit: number;
  unit_id: number;
  unit_short: string;
  available_qty: number;
}

export interface CatalogProduct {
  id: number;
  name: string;
  category: string;
  base_price: number;
  sizes_count: number;
}

export interface CatalogSize {
  id: number;
  size_label: string;
}

export const PF_TYPE_LABELS: Record<PfType, string> = {
  material: "Материальный",
  labor: "ФОТ (труд)",
  fittings: "Фурнитура",
  composite: "Составной",
};

export interface SemiProductComponent {
  id?: number;
  parent_id?: number;
  component_id: number;
  qty: number;
  notes?: string;
  component_name?: string;
  component_type?: PfType;
  component_sku?: string;
}

export interface PeriodSettings {
  lock_date: string | null;
  auto_weekly: boolean;
  last_auto_run: string | null;
}

// -------------------- готовая продукция --------------------

export interface FinishedProductSemi {
  id: number;
  finished_product_id: number;
  semi_product_id: number;
  qty: number;
  semi_product_name?: string;
}

export interface FinishedProductFitting {
  id: number;
  finished_product_id: number;
  fitting_id: number;
  qty: number;
  fitting_name?: string;
}

export interface FinishedProduct {
  id: number;
  name: string;
  sku: string;
  description: string;
  base_price: number;
  is_active: boolean;
  group_id: number | null;
  group_name?: string;
  catalog_product_id: number | null;
  catalog_size_id: number | null;
  catalog_category?: string;
  catalog_product_name?: string;
  size_label: string | null;
  semi_products: FinishedProductSemi[];
  fittings: FinishedProductFitting[];
}

// -------------------- склад --------------------

export interface StockItem {
  id: number;
  warehouse_id: number;
  item_type: string;
  item_id: number;
  qty: number;
  reserved_qty: number;
  warehouse_name?: string;
  item_name?: string;
  updated_at: string;
}

export interface StockMovement {
  id: number;
  warehouse_id: number;
  item_type: string;
  item_id: number;
  movement_type: string;
  qty: number;
  reason: string;
  related_order_id: number | null;
  worker_id: number | null;
  warehouse_name?: string;
  created_at: string;
}

// -------------------- заказы --------------------

export interface OrderItem {
  id: number;
  order_id: number;
  finished_product_id: number;
  qty: number;
  unit_price: number;
  total_price: number;
  notes: string;
  product_name?: string;
}

export interface Order {
  id: number;
  order_number: string;
  client_id: number;
  status: string;
  manager_name: string;
  priority: number;
  deadline: string;
  total_amount: number;
  notes: string;
  client_name?: string;
  client_org?: string;
  items: OrderItem[];
  created_at: string;
  updated_at: string;
}

// -------------------- наряды --------------------

export interface WorkOrderOperation {
  id: number;
  work_order_id: number;
  operation_id: number;
  worker_id: number | null;
  status: string;
  labor_cost: number;
  planned_material_norm: number | null;
  actual_material_norm: number | null;
  material_id: number | null;
  sort_order: number;
  started_at: string | null;
  completed_at: string | null;
  notes: string;
  operation_name?: string;
  has_material_norm?: boolean;
  worker_name?: string;
  material_name?: string;
}

export interface WorkOrder {
  id: number;
  work_order_number: string;
  order_id: number;
  order_item_id: number;
  semi_product_id: number;
  qty: number;
  status: string;
  warehouse_id: number;
  order_number?: string;
  semi_product_name?: string;
  warehouse_name?: string;
  operations: WorkOrderOperation[];
}

// -------------------- перерасход --------------------

export interface OverconsumptionRow {
  id: number;
  planned_material_norm: number;
  actual_material_norm: number;
  overuse_qty: number;
  material_name: string;
  price_per_unit: number;
  overuse_cost: number;
  worker_name: string;
  tab_number: string;
  work_order_number: string;
  order_number: string;
}

// -------------------- себестоимость --------------------

export interface CostMaterialRow {
  material_id: number;
  material_name: string;
  price: number;
  used_qty: number;
  unit_short: string;
  cost: number;
}

export interface CostFittingRow {
  fitting_id: number;
  fitting_name: string;
  price: number;
  qty_per_item: number;
  total_qty: number;
  unit_short: string;
  cost: number;
}

export interface CostItem {
  order_item_id: number;
  finished_product_id: number;
  product_name: string;
  qty: number;
  unit_price: number;
  total_price: number;
  labor_cost: number;
  materials_cost: number;
  fittings_cost: number;
  materials: CostMaterialRow[];
  fittings: CostFittingRow[];
  cost: number;
  revenue: number;
  margin: number;
}

export interface CostReport {
  order_id: number;
  items: CostItem[];
  total_materials: number;
  total_fittings: number;
  total_labor: number;
  total_cost: number;
  total_revenue: number;
  total_margin: number;
}

// -------------------- остатки на дату --------------------

export interface StockOnDateRow {
  item_type: string;
  item_id: number;
  name: string;
  unit_short: string;
  qty: number;
  price: number;
  amount: number;
}

export interface StockOnDateSection {
  item_type: string;
  label: string;
  rows: StockOnDateRow[];
  total_amount: number;
}

export interface StockOnDateReport {
  date: string;
  warehouse_id: number | null;
  sections: StockOnDateSection[];
}

// -------------------- требования-накладные --------------------

export interface RequisitionItem {
  id: number;
  requisition_id: number;
  material_id: number;
  issued_qty: number;
  returned_qty: number;
  norm_qty: number | null;
  notes: string | null;
  material_name?: string;
  unit_short?: string;
}

export interface Requisition {
  id: number;
  doc_number: string;
  warehouse_id: number;
  worker_id: number;
  work_order_id: number | null;
  status: string;
  issued_by: number | null;
  notes: string | null;
  created_at: string;
  closed_at: string | null;
  warehouse_name?: string;
  worker_name?: string;
  issued_by_name?: string;
  work_order_number?: string;
  items: RequisitionItem[];
}

export interface WorkerBalance {
  id: number;
  worker_id: number;
  material_id: number;
  qty: number;
  worker_name?: string;
  material_name?: string;
  unit_short?: string;
}

export interface OveruseRow {
  work_order_id: number | null;
  work_order_number: string | null;
  material_id: number;
  material_name: string;
  unit_short: string;
  worker_name: string | null;
  plan_qty?: number;
  fact_qty: number;
  issued_qty?: number;
  returned_qty?: number;
  norm_qty?: number;
  overuse_qty: number;
  price: number;
  overuse_cost: number;
}

export interface OveruseReport {
  mode: string;
  rows: OveruseRow[];
  total_cost: number;
}

// ============================================================
// Константы
// ============================================================

export const ORDER_STATUSES: { value: string; label: string; color: string }[] =
  [
    { value: "confirmed", label: "Подтверждён", color: "blue" },
    { value: "in_production", label: "В производстве", color: "orange" },
    { value: "ready", label: "Готов", color: "green" },
    { value: "shipped", label: "Отгружен", color: "purple" },
    { value: "completed", label: "Завершён", color: "gray" },
    { value: "cancelled", label: "Отменён", color: "red" },
  ];

export const MOVEMENT_TYPES: { value: string; label: string }[] = [
  { value: "in", label: "Приход" },
  { value: "out", label: "Расход" },
  { value: "transfer", label: "Перемещение" },
  { value: "write_off", label: "Списание" },
  { value: "return", label: "Возврат" },
];

export const ITEM_TYPES: { value: string; label: string }[] = [
  { value: "material", label: "Материал" },
  { value: "fitting", label: "Фурнитура" },
  { value: "semi_product", label: "Полуфабрикат" },
  { value: "finished", label: "Готовая продукция" },
];

// ============================================================
// Утилита для запросов к API
// ============================================================

export async function boFetch(
  entity: string,
  method: string = "GET",
  body?: unknown,
  params?: Record<string, string>,
) {
  const url = new URL(BACKOFFICE_API);
  url.searchParams.set("entity", entity);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = getAuthToken();
  if (token) headers["X-Auth-Token"] = token;

  const options: RequestInit = { method, headers };

  if (body !== undefined && method !== "GET") {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url.toString(), options);

  if (response.status === 401) {
    setAuthToken(null);
    window.dispatchEvent(new Event("bo-unauthorized"));
  }

  if (!response.ok) {
    const text = await response.text();
    let msg = text;
    try {
      msg = JSON.parse(text).error || text;
    } catch {
      /* not json */
    }
    throw new Error(msg);
  }

  return response.json();
}

// ---- авторизация ----

export interface AuthUser {
  id: number;
  full_name: string;
  access_level: string;
}

export type Permissions = Record<string, boolean>;

export async function authFetch(action: string, body?: unknown) {
  const url = new URL(AUTH_API);
  url.searchParams.set("action", action);
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = getAuthToken();
  if (token) headers["X-Auth-Token"] = token;
  const response = await fetch(url.toString(), {
    method: body !== undefined ? "POST" : "GET",
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Ошибка ${response.status}`);
  }
  return data;
}