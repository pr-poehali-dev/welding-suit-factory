-- Спецификации: варианты состава изделия (активна одна на изделие)
CREATE TABLE IF NOT EXISTS t_p87775074_welding_suit_factory.specifications (
  id SERIAL PRIMARY KEY,
  finished_product_id INTEGER NOT NULL REFERENCES t_p87775074_welding_suit_factory.finished_products(id),
  name VARCHAR(255) NOT NULL DEFAULT 'Основная',
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_spec_fp ON t_p87775074_welding_suit_factory.specifications(finished_product_id);

-- Полуфабрикат принадлежит спецификации
ALTER TABLE t_p87775074_welding_suit_factory.semi_products
  ADD COLUMN IF NOT EXISTS specification_id INTEGER REFERENCES t_p87775074_welding_suit_factory.specifications(id);

CREATE INDEX IF NOT EXISTS idx_sp_spec ON t_p87775074_welding_suit_factory.semi_products(specification_id);

-- Количество ПФ в спецификации (переносим смысл finished_product_semi.qty на связь ПФ↔спецификация)
ALTER TABLE t_p87775074_welding_suit_factory.semi_products
  ADD COLUMN IF NOT EXISTS spec_qty NUMERIC(10,2) NOT NULL DEFAULT 1;