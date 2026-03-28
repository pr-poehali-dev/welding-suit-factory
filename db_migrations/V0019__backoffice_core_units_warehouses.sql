
-- ЕДИНИЦЫ ИЗМЕРЕНИЯ
CREATE TABLE units (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    short_name VARCHAR(20) NOT NULL,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO units (name, short_name, is_default) VALUES
('Метр', 'м', true),
('Штука', 'шт', true),
('Килограмм', 'кг', true),
('Литр', 'л', true),
('Рулон', 'рул', true),
('Пара', 'пар', true),
('Комплект', 'компл', true),
('Упаковка', 'уп', true);

-- СКЛАДЫ
CREATE TABLE warehouses (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL,
    address TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO warehouses (name, city) VALUES
('Склад Рязань', 'Рязань'),
('Склад Москва', 'Москва');

-- КЛИЕНТЫ
CREATE TABLE clients (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    org VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(255),
    inn VARCHAR(20),
    address TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- СОТРУДНИКИ
CREATE TABLE workers (
    id SERIAL PRIMARY KEY,
    tab_number VARCHAR(20) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    position VARCHAR(100),
    phone VARCHAR(50),
    hourly_rate NUMERIC(10,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);
