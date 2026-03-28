
-- МАТЕРИАЛЫ
CREATE TABLE materials (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(50),
    unit_id INTEGER REFERENCES units(id),
    price_per_unit NUMERIC(12,2) DEFAULT 0,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ФУРНИТУРА
CREATE TABLE fittings (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(50),
    unit_id INTEGER REFERENCES units(id),
    price_per_unit NUMERIC(12,2) DEFAULT 0,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ОПЕРАЦИИ ПРОИЗВОДСТВА
CREATE TABLE operations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    has_material_norm BOOLEAN DEFAULT false,
    default_price NUMERIC(10,2) DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO operations (name, has_material_norm, sort_order) VALUES
('Крой', true, 1),
('Пошив', false, 2),
('ВТО (влажно-тепловая обработка)', false, 3),
('Контроль качества', false, 4),
('Упаковка', false, 5);
