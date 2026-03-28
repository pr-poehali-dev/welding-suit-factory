// ============================================================
// Backoffice API — швейное производство
// ============================================================

export const BACKOFFICE_API =
  "https://functions.poehali.dev/1ab6512a-2f81-431f-a593-c6a9b944fe39";

// -------------------- группы --------------------

export interface Group {
  id: number;
  entity_type: string;
  name: string;
  sort_order: number;
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
}

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
  created_at: string;
  updated_at: string;
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

export interface SemiProduct {
  id: number;
  name: string;
  sku: string;
  description: string;
  is_active: boolean;
  materials: SemiProductMaterial[];
  operations: SemiProductOperation[];
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

  const options: RequestInit = {
    method,
    headers: { "Content-Type": "application/json" },
  };

  if (body !== undefined && method !== "GET") {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url.toString(), options);

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`boFetch error ${response.status}: ${text}`);
  }

  return response.json();
}