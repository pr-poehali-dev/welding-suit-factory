
-- ПОЛУФАБРИКАТЫ
CREATE TABLE semi_products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(50),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- СОСТАВ ПОЛУФАБРИКАТА: материалы + нормы
CREATE TABLE semi_product_materials (
    id SERIAL PRIMARY KEY,
    semi_product_id INTEGER NOT NULL REFERENCES semi_products(id) ON UPDATE CASCADE,
    material_id INTEGER NOT NULL REFERENCES materials(id),
    norm_qty NUMERIC(12,4) NOT NULL DEFAULT 0,
    notes TEXT,
    UNIQUE(semi_product_id, material_id)
);

-- ФОТ ПОЛУФАБРИКАТА: операции + стоимость
CREATE TABLE semi_product_operations (
    id SERIAL PRIMARY KEY,
    semi_product_id INTEGER NOT NULL REFERENCES semi_products(id) ON UPDATE CASCADE,
    operation_id INTEGER NOT NULL REFERENCES operations(id),
    labor_cost NUMERIC(10,2) NOT NULL DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    notes TEXT,
    UNIQUE(semi_product_id, operation_id)
);

-- ГОТОВАЯ ПРОДУКЦИЯ
CREATE TABLE finished_products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(50),
    description TEXT,
    base_price NUMERIC(12,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- СОСТАВ ТОВАРА: полуфабрикаты
CREATE TABLE finished_product_semi (
    id SERIAL PRIMARY KEY,
    finished_product_id INTEGER NOT NULL REFERENCES finished_products(id) ON UPDATE CASCADE,
    semi_product_id INTEGER NOT NULL REFERENCES semi_products(id),
    qty NUMERIC(10,2) NOT NULL DEFAULT 1,
    UNIQUE(finished_product_id, semi_product_id)
);

-- СОСТАВ ТОВАРА: фурнитура
CREATE TABLE finished_product_fittings (
    id SERIAL PRIMARY KEY,
    finished_product_id INTEGER NOT NULL REFERENCES finished_products(id) ON UPDATE CASCADE,
    fitting_id INTEGER NOT NULL REFERENCES fittings(id),
    qty NUMERIC(10,2) NOT NULL DEFAULT 1,
    UNIQUE(finished_product_id, fitting_id)
);
