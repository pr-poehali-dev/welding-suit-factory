
-- СКЛАДСКИЕ ОСТАТКИ
CREATE TABLE stock (
    id SERIAL PRIMARY KEY,
    warehouse_id INTEGER NOT NULL REFERENCES warehouses(id),
    item_type VARCHAR(20) NOT NULL,
    item_id INTEGER NOT NULL,
    qty NUMERIC(12,4) NOT NULL DEFAULT 0,
    reserved_qty NUMERIC(12,4) NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(warehouse_id, item_type, item_id)
);

-- ДВИЖЕНИЕ СКЛАДА
CREATE TABLE stock_movements (
    id SERIAL PRIMARY KEY,
    warehouse_id INTEGER NOT NULL REFERENCES warehouses(id),
    item_type VARCHAR(20) NOT NULL,
    item_id INTEGER NOT NULL,
    movement_type VARCHAR(20) NOT NULL,
    qty NUMERIC(12,4) NOT NULL,
    reason TEXT,
    related_order_id INTEGER,
    worker_id INTEGER REFERENCES workers(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ЗАКАЗЫ
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    order_number VARCHAR(30) NOT NULL UNIQUE,
    client_id INTEGER REFERENCES clients(id),
    status VARCHAR(30) NOT NULL DEFAULT 'confirmed',
    manager_name VARCHAR(100),
    priority INTEGER DEFAULT 0,
    deadline DATE,
    total_amount NUMERIC(12,2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ПОЗИЦИИ ЗАКАЗА
CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON UPDATE CASCADE,
    finished_product_id INTEGER NOT NULL REFERENCES finished_products(id),
    qty INTEGER NOT NULL DEFAULT 1,
    unit_price NUMERIC(12,2) DEFAULT 0,
    total_price NUMERIC(12,2) DEFAULT 0,
    notes TEXT
);

-- ЗАКАЗ-НАРЯДЫ
CREATE TABLE work_orders (
    id SERIAL PRIMARY KEY,
    work_order_number VARCHAR(30) NOT NULL UNIQUE,
    order_id INTEGER NOT NULL REFERENCES orders(id),
    order_item_id INTEGER NOT NULL REFERENCES order_items(id),
    semi_product_id INTEGER NOT NULL REFERENCES semi_products(id),
    qty INTEGER NOT NULL DEFAULT 1,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    warehouse_id INTEGER REFERENCES warehouses(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ОПЕРАЦИИ ЗАКАЗ-НАРЯДА
CREATE TABLE work_order_operations (
    id SERIAL PRIMARY KEY,
    work_order_id INTEGER NOT NULL REFERENCES work_orders(id) ON UPDATE CASCADE,
    operation_id INTEGER NOT NULL REFERENCES operations(id),
    worker_id INTEGER REFERENCES workers(id),
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    labor_cost NUMERIC(10,2) DEFAULT 0,
    planned_material_norm NUMERIC(12,4),
    actual_material_norm NUMERIC(12,4),
    material_id INTEGER REFERENCES materials(id),
    sort_order INTEGER DEFAULT 0,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    notes TEXT
);

-- СЕБЕСТОИМОСТЬ
CREATE TABLE cost_calculations (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id),
    order_item_id INTEGER REFERENCES order_items(id),
    materials_cost NUMERIC(12,2) DEFAULT 0,
    fittings_cost NUMERIC(12,2) DEFAULT 0,
    labor_cost NUMERIC(12,2) DEFAULT 0,
    total_cost NUMERIC(12,2) DEFAULT 0,
    sell_price NUMERIC(12,2) DEFAULT 0,
    profit NUMERIC(12,2) DEFAULT 0,
    calculated_at TIMESTAMPTZ DEFAULT now()
);
