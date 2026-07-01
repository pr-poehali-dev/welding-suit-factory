ALTER TABLE t_p87775074_welding_suit_factory.semi_products
  ADD COLUMN IF NOT EXISTS pf_type VARCHAR(20) NOT NULL DEFAULT 'material',
  ADD COLUMN IF NOT EXISTS size_label VARCHAR(50),
  ADD COLUMN IF NOT EXISTS product_id INTEGER;

CREATE INDEX IF NOT EXISTS idx_semi_products_group ON t_p87775074_welding_suit_factory.semi_products(group_id);
CREATE INDEX IF NOT EXISTS idx_semi_products_pf_type ON t_p87775074_welding_suit_factory.semi_products(pf_type);