-- Единица измерения "Бобина"
INSERT INTO t_p87775074_welding_suit_factory.units (name, short_name, is_default)
SELECT 'Бобина', 'боб', false
WHERE NOT EXISTS (
  SELECT 1 FROM t_p87775074_welding_suit_factory.units WHERE short_name = 'боб'
);

-- Справочник ставок НДС
CREATE TABLE IF NOT EXISTS t_p87775074_welding_suit_factory.vat_rates (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  is_no_vat BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO t_p87775074_welding_suit_factory.vat_rates (name, rate, is_no_vat, sort_order)
SELECT * FROM (VALUES
  ('Без НДС', 0::numeric, true, 0),
  ('0%', 0::numeric, false, 1),
  ('10%', 10::numeric, false, 2),
  ('22%', 22::numeric, false, 3)
) AS v(name, rate, is_no_vat, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM t_p87775074_welding_suit_factory.vat_rates);

-- Справочник поставщиков
CREATE TABLE IF NOT EXISTS t_p87775074_welding_suit_factory.suppliers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  inn VARCHAR(20),
  phone VARCHAR(50),
  contact_person VARCHAR(255),
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Новые поля материала
ALTER TABLE t_p87775074_welding_suit_factory.materials
  ADD COLUMN IF NOT EXISTS color VARCHAR(100),
  ADD COLUMN IF NOT EXISTS density VARCHAR(100),
  ADD COLUMN IF NOT EXISTS supplier_id INTEGER REFERENCES t_p87775074_welding_suit_factory.suppliers(id),
  ADD COLUMN IF NOT EXISTS vat_rate_id INTEGER REFERENCES t_p87775074_welding_suit_factory.vat_rates(id);