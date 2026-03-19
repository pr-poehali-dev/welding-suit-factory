ALTER TABLE t_p87775074_welding_suit_factory.products
  ADD COLUMN stock_status varchar(20) NOT NULL DEFAULT 'in_stock'
  CHECK (stock_status IN ('in_stock', 'few', 'low', 'on_order'));