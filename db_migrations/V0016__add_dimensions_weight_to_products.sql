ALTER TABLE t_p87775074_welding_suit_factory.products
  ADD COLUMN IF NOT EXISTS pack_length  NUMERIC(8,1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pack_width   NUMERIC(8,1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pack_height  NUMERIC(8,1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unit_weight  NUMERIC(8,3) NOT NULL DEFAULT 0;

COMMENT ON COLUMN t_p87775074_welding_suit_factory.products.pack_length IS 'Длина упаковки, см';
COMMENT ON COLUMN t_p87775074_welding_suit_factory.products.pack_width  IS 'Ширина упаковки, см';
COMMENT ON COLUMN t_p87775074_welding_suit_factory.products.pack_height IS 'Высота упаковки, см';
COMMENT ON COLUMN t_p87775074_welding_suit_factory.products.unit_weight IS 'Вес единицы, кг';