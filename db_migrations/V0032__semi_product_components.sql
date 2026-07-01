CREATE TABLE IF NOT EXISTS t_p87775074_welding_suit_factory.semi_product_components (
  id SERIAL PRIMARY KEY,
  parent_id INTEGER NOT NULL REFERENCES t_p87775074_welding_suit_factory.semi_products(id),
  component_id INTEGER NOT NULL REFERENCES t_p87775074_welding_suit_factory.semi_products(id),
  qty NUMERIC(12,4) NOT NULL DEFAULT 1,
  notes TEXT,
  UNIQUE(parent_id, component_id)
);

CREATE INDEX IF NOT EXISTS idx_spc_parent ON t_p87775074_welding_suit_factory.semi_product_components(parent_id);
CREATE INDEX IF NOT EXISTS idx_spc_component ON t_p87775074_welding_suit_factory.semi_product_components(component_id);